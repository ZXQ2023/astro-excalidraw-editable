import { remarkExcalidrawEditable } from './remark-plugin.js'
import { excalidrawEditableVitePlugin } from './vite-plugin.js'
import type { ExcalidrawEditableOptions } from './types.js'
import type { AstroIntegration } from 'astro'

const OPTIMIZE_DEPS = ['@excalidraw/excalidraw', 'es6-promise-pool']

function appendOptimizeDeps(include: string[] = []) {
  return Array.from(new Set([...include, ...OPTIMIZE_DEPS]))
}

export function excalidrawEditable(
  options: ExcalidrawEditableOptions = {},
): AstroIntegration {
  return {
    name: '@hokkeung/astro-excalidraw-editable',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [[
              remarkExcalidrawEditable,
              {
                allowedDir: options.allowedDir,
                allowedSuffix: options.allowedSuffix,
                componentNames: options.componentNames,
                root: config.root,
              },
            ]],
          },
          vite: {
            optimizeDeps: {
              ...config.vite.optimizeDeps,
              include: appendOptimizeDeps(config.vite.optimizeDeps?.include),
            },
            plugins: [excalidrawEditableVitePlugin(options)],
          },
        })
      },
    },
  }
}
