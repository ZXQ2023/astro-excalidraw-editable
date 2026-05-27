import { execFile } from 'node:child_process'
import { copyFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = resolve(packageRoot, 'dist')

await rm(distDir, { force: true, recursive: true })

await execFileAsync('tsc', ['-p', 'tsconfig.build.json'], {
  cwd: packageRoot,
  stdio: 'inherit',
})

await copyFile(
  resolve(packageRoot, 'src/Excalidraw.astro'),
  resolve(distDir, 'Excalidraw.astro'),
)

await writeFile(
  resolve(distDir, 'Excalidraw.astro.d.ts'),
  `import type { AstroComponentFactory } from 'astro/runtime/server/index.js'
import type { ExcalidrawProps } from './react/ExcalidrawEditable.js'

export interface ExcalidrawAstroProps extends ExcalidrawProps {
  class?: string
  dataPath?: string
  editable?: boolean
  height?: number | string
  saveEndpoint?: string
  src?: string
}

declare const Excalidraw: AstroComponentFactory
export default Excalidraw
`,
)
