import { spawn } from 'node:child_process'
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = resolve(packageRoot, 'dist')

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolveRun()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

await rm(distDir, { force: true, recursive: true })

await run('vite', ['build'])
await run('tsc', ['-p', 'tsconfig.build.json'])

await mkdir(distDir, { recursive: true })
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
