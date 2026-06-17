import { Excalidraw as Draw, serializeAsJSON } from '@excalidraw/excalidraw'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

const DEFAULT_SAVE_ENDPOINT = '/__excalidraw_save'
/** 1 = Virgil, 2 = Helvetica, 3 = Cascadia. */
const FONT_FAMILY = 3

const getDocumentTheme = () =>
  typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light'

export type ExcalidrawProps = ComponentProps<typeof Draw>
type OnChangeArgs = Parameters<NonNullable<ExcalidrawProps['onChange']>>
type SceneElement = ReturnType<ExcalidrawImperativeAPI['getSceneElements']>[
  number
]

interface EditableProps {
  dataPath?: string
  editable?: boolean
  saveEndpoint?: string
}

export function ExcalidrawEditable(
  {
    dataPath,
    editable,
    initialData,
    onChange,
    saveEndpoint = DEFAULT_SAVE_ENDPOINT,
    ...drawProps
  }: EditableProps & ExcalidrawProps,
) {
  const [theme, setTheme] = useState<'light' | 'dark'>(getDocumentTheme)
  const [isEditing, setIsEditing] = useState(false)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeInitialData, setActiveInitialData] = useState(initialData)
  const [previewKey, setPreviewKey] = useState(0)
  const [editorKey, setEditorKey] = useState(0)
  const [expandedPreviewKey, setExpandedPreviewKey] = useState(0)

  const latestOnChangeArgs = useRef<OnChangeArgs | null>(null)
  const lastSavedSnapshot = useRef('')
  const isFirstChange = useRef(true)

  useEffect(() => {
    // Excalidraw reads initialData on mount, so reset the preview when it changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveInitialData(initialData)
    setPreviewKey((key) => key + 1)
  }, [initialData])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getDocumentTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  const scrollPreviewToContent = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      const interval = setInterval(() => {
        const elements = api.getSceneElements()
        if (elements.length > 0) {
          api.updateScene({
            elements: elements.map((el: SceneElement) =>
              el.type === 'text' && el.fontFamily !== FONT_FAMILY
                ? { ...el, fontFamily: FONT_FAMILY }
                : el
            ),
          })
          api.scrollToContent(undefined, { fitToContent: true })
          clearInterval(interval)
        }
      }, 10)
    },
    [],
  )

  const previewExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      scrollPreviewToContent(api)
    },
    [scrollPreviewToContent],
  )

  const handleChange = useCallback(
    (...args: OnChangeArgs) => {
      latestOnChangeArgs.current = args
      onChange?.(...args)

      if (editable) {
        const snapshot = JSON.stringify(args[0])
        if (isFirstChange.current) {
          lastSavedSnapshot.current = snapshot
          isFirstChange.current = false
          return
        }
        setIsDirty(snapshot !== lastSavedSnapshot.current)
      }
    },
    [editable, onChange],
  )

  const openEditor = useCallback(() => {
    latestOnChangeArgs.current = null
    isFirstChange.current = true
    setIsDirty(false)
    setEditorKey((key) => key + 1)
    setIsEditing(true)
  }, [])

  const closeEditor = useCallback(() => {
    if (isDirty && !globalThis.confirm('有未保存的修改，确定关闭编辑器吗？')) {
      return
    }
    setIsEditing(false)
    setIsDirty(false)
  }, [isDirty])

  const openExpandedPreview = useCallback(() => {
    setExpandedPreviewKey((key) => key + 1)
    setIsPreviewExpanded(true)
  }, [])

  const closeExpandedPreview = useCallback(() => {
    setIsPreviewExpanded(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!editable || !dataPath || isSaving) return
    setIsSaving(true)

    try {
      const args = latestOnChangeArgs.current
      if (!args) return

      const [elements, appState, files] = args
      const jsonStr = serializeAsJSON(elements, appState, files, 'local')
      const data = JSON.parse(jsonStr)

      const res = await fetch(saveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: dataPath, data }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      lastSavedSnapshot.current = JSON.stringify(elements)
      setActiveInitialData(data)
      setPreviewKey((key) => key + 1)
      setIsDirty(false)
    } catch (error) {
      console.error('[excalidraw-editable] save failed:', error)
      alert(`保存失败: ${error instanceof Error ? error.message : error}`)
    } finally {
      setIsSaving(false)
    }
  }, [editable, dataPath, isSaving, saveEndpoint])

  useEffect(() => {
    if (!editable || !isEditing) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        closeEditor()
      }
    }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [editable, isEditing, handleSave, closeEditor])

  useEffect(() => {
    if (!editable) return
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editable, isDirty])

  useEffect(() => {
    if (!editable || !isEditing) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [editable, isEditing])

  useEffect(() => {
    if (!isPreviewExpanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeExpandedPreview()
      }
    }
    globalThis.addEventListener('keydown', handler)

    return () => {
      document.body.style.overflow = previousOverflow
      globalThis.removeEventListener('keydown', handler)
    }
  }, [isPreviewExpanded, closeExpandedPreview])

  const editor = editable && isEditing
    ? (
      <div style={editorOverlayStyle}>
        <div style={editorPanelStyle}>
          <div style={editorHeaderStyle}>
            <div style={editorTitleStyle}>
              <span style={editorTitleTextStyle}>Excalidraw 编辑器</span>
              {dataPath && <code style={editorPathStyle}>{dataPath}</code>}
            </div>
            <div style={editorActionsStyle}>
              <button
                onClick={handleSave}
                disabled={!dataPath || !isDirty || isSaving}
                style={{
                  ...editorButtonStyle,
                  ...(
                    isDirty
                      ? editorSaveButtonActiveStyle
                      : editorSaveButtonIdleStyle
                  ),
                }}
                type='button'
              >
                {isSaving
                  ? '保存中...'
                  : isDirty
                  ? '保存 (Cmd+S)'
                  : '已保存'}
              </button>
              <button
                onClick={closeEditor}
                style={editorButtonStyle}
                type='button'
              >
                关闭
              </button>
            </div>
          </div>
          <div style={editorCanvasStyle}>
            <Draw
              key={editorKey}
              theme={theme}
              initialData={activeInitialData}
              onChange={handleChange}
              autoFocus
              {...drawProps}
            />
          </div>
        </div>
      </div>
    )
    : null

  const expandedPreview = isPreviewExpanded
    ? (
      <div
        aria-label='关闭预览'
        className='excalidraw-expanded-preview'
        onClick={closeExpandedPreview}
        role='button'
        style={previewOverlayStyle}
        tabIndex={-1}
      >
        <style>{previewOnlyStyle}</style>
        <div
          className='excalidraw-preview-canvas'
          style={expandedPreviewCanvasStyle}
        >
          <Draw
            key={expandedPreviewKey}
            viewModeEnabled
            theme={theme}
            excalidrawAPI={previewExcalidrawAPI}
            initialData={activeInitialData}
            {...drawProps}
          />
        </div>
      </div>
    )
    : null

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className='excalidraw-preview-canvas' style={canvasFillStyle}>
        <Draw
          key={previewKey}
          viewModeEnabled
          theme={theme}
          excalidrawAPI={previewExcalidrawAPI}
          initialData={activeInitialData}
          {...drawProps}
        />
      </div>
      <div style={previewActionsStyle}>
        <button
          aria-label='Zoom preview'
          onClick={openExpandedPreview}
          style={previewButtonStyle}
          title='Zoom preview'
          type='button'
        >
          <ZoomInIcon />
        </button>
        {editable && dataPath && (
          <button
            aria-label='Edit diagram'
            onClick={openEditor}
            style={previewButtonStyle}
            title='Edit diagram'
            type='button'
          >
            <EditIcon />
          </button>
        )}
      </div>
      {expandedPreview && createPortal(expandedPreview, document.body)}
      {editor && createPortal(editor, document.body)}
    </div>
  )
}

const previewActionsStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  pointerEvents: 'auto',
}

const previewButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  padding: 0,
  borderRadius: 6,
  border: '1px solid rgba(15, 23, 42, 0.14)',
  backgroundColor: 'rgba(255, 255, 255, 0.94)',
  boxShadow: '0 8px 22px rgba(15, 23, 42, 0.12)',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1,
}

function ZoomInIcon() {
  return (
    <svg
      aria-hidden='true'
      fill='none'
      height='18'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth='2'
      viewBox='0 0 24 24'
      width='18'
    >
      <circle cx='11' cy='11' r='7' />
      <path d='m20 20-4.3-4.3' />
      <path d='M11 8v6' />
      <path d='M8 11h6' />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg
      aria-hidden='true'
      fill='none'
      height='18'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth='2'
      viewBox='0 0 24 24'
      width='18'
    >
      <path d='M12 20h9' />
      <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' />
    </svg>
  )
}

const canvasFillStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
}

const editorOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5vh 5vw',
  flexDirection: 'column',
  backgroundColor: 'rgba(15, 23, 42, 0.42)',
  pointerEvents: 'auto',
}

const previewOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  boxSizing: 'border-box',
  padding: '6vh 6vw',
  backgroundColor: 'rgba(248, 250, 252, 0.28)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  cursor: 'zoom-out',
  pointerEvents: 'auto',
}

const expandedPreviewCanvasStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 8,
  overflow: 'hidden',
  pointerEvents: 'none',
}

const previewOnlyStyle = `
.excalidraw-expanded-preview .App-toolbar-content,
.excalidraw-expanded-preview .context-menu,
.excalidraw-expanded-preview .layer-ui__wrapper__footer-right,
.excalidraw-expanded-preview .help-icon,
.excalidraw-expanded-preview .Stack_vertical,
.excalidraw-expanded-preview footer {
  display: none !important;
}
`

const editorPanelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '90vw',
  height: '90vh',
  overflow: 'hidden',
  borderRadius: 8,
  backgroundColor: '#f8fafc',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
}

const editorHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  minHeight: 56,
  padding: '10px 14px',
  borderBottom: '1px solid rgba(15, 23, 42, 0.12)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  fontFamily: 'system-ui, sans-serif',
}

const editorTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
}

const editorTitleTextStyle: CSSProperties = {
  flexShrink: 0,
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 700,
}

const editorPathStyle: CSSProperties = {
  overflow: 'hidden',
  color: '#64748b',
  fontSize: 12,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const editorActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
}

const editorButtonStyle: CSSProperties = {
  padding: '7px 14px',
  borderRadius: 6,
  border: '1px solid rgba(15, 23, 42, 0.14)',
  backgroundColor: '#fff',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'system-ui, sans-serif',
}

const editorSaveButtonActiveStyle: CSSProperties = {
  borderColor: '#059669',
  backgroundColor: '#ecfdf5',
  color: '#047857',
}

const editorSaveButtonIdleStyle: CSSProperties = {
  color: '#94a3b8',
  cursor: 'default',
}

const editorCanvasStyle: CSSProperties = {
  minHeight: 0,
  flex: 1,
}
