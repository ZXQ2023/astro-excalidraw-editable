import type { RemarkExcalidrawEditableOptions } from './remark-plugin.js'

export interface ExcalidrawEditableOptions extends
  Pick<
    RemarkExcalidrawEditableOptions,
    'allowedDir' | 'allowedSuffix' | 'componentNames'
  >
{
  /**
   * Directory, relative to the Vite root, where edited Excalidraw JSON files may
   * be written.
   */
  allowedDir?: string
  /** File suffix accepted by the save endpoint. */
  allowedSuffix?: string
  /** Dev-only save endpoint used by the client component and Vite middleware. */
  endpoint?: string
}
