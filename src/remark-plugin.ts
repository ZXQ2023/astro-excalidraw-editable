import { dirname, isAbsolute, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  createMdxEsmImport,
  createMdxExpressionAttribute,
  createMdxStringAttribute,
} from './mdx-ast.js'

const DEFAULT_ALLOWED_DIR = 'src/content/excalidraw'
const DEFAULT_ALLOWED_SUFFIX = '.excalidraw.json'
const DEFAULT_COMPONENT_NAMES = ['Excalidraw', 'ExcalidrawWrapper']

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute'
  name: string
  value?: string | {
    type?: string
    value?: string
  } | null
}

interface MdxJsxElement {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
  name?: string | null
  attributes?: unknown[]
}

interface RemarkFile {
  path?: string
  cwd?: string
  message?: (reason: string, node?: unknown) => void
}

interface RemarkRoot {
  type: 'root'
  children: unknown[]
}

export interface RemarkExcalidrawEditableOptions {
  /** Directory, relative to the project root, used for shorthand src values. */
  allowedDir?: string
  /** File suffix appended to shorthand src values. */
  allowedSuffix?: string
  /** JSX component names whose string `src` prop should be transformed. */
  componentNames?: string[]
  /** Project root used to derive repository-relative dataPath values. */
  root?: string | URL
}

function normalizePath(path: string) {
  return path.replaceAll('\\', '/').replace(/^\/+/, '')
}

function normalizeDir(path: string) {
  return normalizePath(path).replace(/\/$/, '')
}

function getRootPath(root?: string | URL, file?: RemarkFile) {
  if (root instanceof URL) return fileURLToPath(root)
  if (root) return root
  return file?.cwd ?? process.cwd()
}

function isMdxJsxElement(node: unknown): node is MdxJsxElement {
  if (!node || typeof node !== 'object') return false
  const type = (node as { type?: unknown }).type
  return type === 'mdxJsxFlowElement' || type === 'mdxJsxTextElement'
}

function isMdxJsxAttribute(node: unknown): node is MdxJsxAttribute {
  return Boolean(
    node
      && typeof node === 'object'
      && (node as { type?: unknown }).type === 'mdxJsxAttribute'
      && typeof (node as { name?: unknown }).name === 'string',
  )
}

function getStringAttributeValue(attribute: MdxJsxAttribute) {
  return typeof attribute.value === 'string' ? attribute.value : undefined
}

function visit(node: unknown, callback: (node: unknown) => void) {
  callback(node)

  if (!node || typeof node !== 'object') return

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, callback)
    } else if (value && typeof value === 'object') {
      visit(value, callback)
    }
  }
}

function resolveDiagramSrc(
  src: string,
  filePath: string | undefined,
  rootPath: string,
  allowedDir: string,
  allowedSuffix: string,
) {
  const withSuffix = src.endsWith(allowedSuffix)
    ? src
    : `${src}${allowedSuffix}`
  const normalized = normalizePath(withSuffix)

  if (withSuffix.startsWith('.') && filePath) {
    const absolutePath = resolve(dirname(filePath), withSuffix)
    return {
      dataPath: normalizePath(relative(rootPath, absolutePath)),
      importSource: withSuffix,
    }
  }

  if (withSuffix.startsWith('/')) {
    return {
      dataPath: normalized,
      importSource: `/${normalized}`,
    }
  }

  if (normalized.startsWith('src/')) {
    return {
      dataPath: normalized,
      importSource: `/${normalized}`,
    }
  }

  if (isAbsolute(withSuffix)) {
    return {
      dataPath: normalizePath(relative(rootPath, withSuffix)),
      importSource: withSuffix,
    }
  }

  const dataPath = `${allowedDir}/${normalized}`
  return {
    dataPath,
    importSource: `/${dataPath}`,
  }
}

/**
 * Remark 插件：在构建时自动转换 MDX 中的 `<Excalidraw src="..." />` 组件。
 * 扫描 MDX AST，将字符串 `src` 属性转换为 `initialData`（JSON import）和 `dataPath`（文件路径），
 * 并在文件顶部注入对应的 ESM import 语句。
 *
 * 转换前：<Excalidraw src="diagram.excalidraw.json" />
 * 转换后：import __excalidrawData0 from "..."; <Excalidraw initialData={__excalidrawData0} dataPath="..." />
 *
 * A Remark plugin that transforms `<Excalidraw src="..." />` components in MDX at build time.
 * Scans the MDX AST, converts the string `src` attribute into `initialData` (JSON import) and `dataPath` (file path),
 * and injects the corresponding ESM import statements at the top of the file.
 *
 * Before: <Excalidraw src="diagram.excalidraw.json" />
 * After:  import __excalidrawData0 from "..."; <Excalidraw initialData={__excalidrawData0} dataPath="..." />
 */
export function remarkExcalidrawEditable(
  options: RemarkExcalidrawEditableOptions = {},
) {
  const allowedDir = normalizeDir(options.allowedDir ?? DEFAULT_ALLOWED_DIR)
  const allowedSuffix = options.allowedSuffix ?? DEFAULT_ALLOWED_SUFFIX
  const componentNames = new Set(
    options.componentNames ?? DEFAULT_COMPONENT_NAMES,
  )

  return function transform(root: RemarkRoot, file: RemarkFile = {}) {
    const rootPath = resolve(getRootPath(options.root, file))
    const imports = new Map<string, string>()
    let importIndex = 0

    visit(root, (node) => {
      if (!isMdxJsxElement(node)) return
      if (!node.name || !componentNames.has(node.name)) return

      const attributes = node.attributes ?? []
      const srcAttribute = attributes.find((attribute) =>
        isMdxJsxAttribute(attribute) && attribute.name === 'src'
      )

      if (!isMdxJsxAttribute(srcAttribute)) return

      const srcValue = getStringAttributeValue(srcAttribute)
      if (!srcValue) {
        file.message?.(
          '[excalidraw-editable] `src` must be a string literal to auto-generate initialData and dataPath.',
          node,
        )
        return
      }

      const hasGeneratedProps = attributes.some((attribute) =>
        isMdxJsxAttribute(attribute)
        && (attribute.name === 'initialData' || attribute.name === 'dataPath')
      )

      if (hasGeneratedProps) {
        file.message?.(
          '[excalidraw-editable] skipped `src` transform because initialData or dataPath is already present.',
          node,
        )
        return
      }

      const resolved = resolveDiagramSrc(
        srcValue,
        file.path,
        rootPath,
        allowedDir,
        allowedSuffix,
      )

      let importName = imports.get(resolved.importSource)
      if (!importName) {
        importName = `__excalidrawData${importIndex++}`
        imports.set(resolved.importSource, importName)
      }

      node.attributes = attributes
        .filter((attribute) =>
          !isMdxJsxAttribute(attribute) || attribute.name !== 'src'
        )
        .concat([
          createMdxExpressionAttribute('initialData', importName),
          createMdxStringAttribute('dataPath', resolved.dataPath),
        ])
    })

    if (!imports.size) return

    root.children.unshift(
      ...Array.from(
        imports,
        ([source, name]) => createMdxEsmImport(name, source),
      ),
    )
  }
}
