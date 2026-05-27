import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { ExcalidrawEditableOptions } from './types.js'
import type { IncomingMessage, ServerResponse } from 'node:http'

const DEFAULT_ALLOWED_DIR = 'src/content/excalidraw'
const DEFAULT_ALLOWED_SUFFIX = '.excalidraw.json'
const DEFAULT_ENDPOINT = '/__excalidraw_save'

interface ViteDevServer {
  config: {
    root: string
    logger: { info: (msg: string) => void; error: (msg: string) => void }
  }
  middlewares: {
    use: (
      path: string,
      handler: (req: IncomingMessage, res: ServerResponse) => void,
    ) => void
  }
}

function normalizeRelativePath(path: string) {
  return path.replaceAll('\\', '/').replace(/^\.?\//, '').replace(/\/$/, '')
}

function isPathInside(parent: string, child: string) {
  const relation = relative(parent, child)
  return relation === ''
    || (!relation.startsWith('..') && !isAbsolute(relation))
}

export function excalidrawEditableVitePlugin(
  options: ExcalidrawEditableOptions = {},
) {
  const allowedDir = normalizeRelativePath(
    options.allowedDir ?? DEFAULT_ALLOWED_DIR,
  )
  const allowedSuffix = options.allowedSuffix ?? DEFAULT_ALLOWED_SUFFIX
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT

  return {
    name: 'excalidraw-editable-save',
    configureServer(server: ViteDevServer) {
      const root = resolve(server.config.root)
      const allowedAbsDir = resolve(root, allowedDir)

      server.middlewares.use(
        endpoint,
        async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method Not Allowed')
            return
          }

          let body = ''
          for await (const chunk of req) {
            body += chunk
          }

          let parsed: { filePath?: string; data?: unknown }
          try {
            parsed = JSON.parse(body)
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid JSON' }))
            return
          }

          const { filePath, data } = parsed

          if (!filePath || !data) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Missing filePath or data' }))
            return
          }

          const normalizedFilePath = normalizeRelativePath(filePath)
          const absPath = resolve(root, normalizedFilePath)

          if (
            !normalizedFilePath.endsWith(allowedSuffix)
            || !isPathInside(allowedAbsDir, absPath)
          ) {
            res.statusCode = 403
            res.end(JSON.stringify({
              error: `Only ${
                allowedDir.split('/').join(sep)
              }/*${allowedSuffix} can be saved`,
            }))
            return
          }

          try {
            mkdirSync(dirname(absPath), { recursive: true })
            writeFileSync(absPath, JSON.stringify(data, null, 2).concat('\n'))
            server.config.logger.info(
              `[excalidraw-editable] saved ${normalizedFilePath}`,
            )
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            server.config.logger.error(
              `[excalidraw-editable] failed to save ${normalizedFilePath}: ${error}`,
            )
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Write failed' }))
          }
        },
      )
    },
  }
}
