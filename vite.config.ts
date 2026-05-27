import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'

const externalPackages = [
  '@astrojs/react',
  '@excalidraw/excalidraw',
  'astro',
  'react',
  'react-dom',
]

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
])

function isExternal(id: string) {
  return nodeBuiltins.has(id)
    || externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`))
}

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        integration: 'src/integration.ts',
        'react/ExcalidrawEditable': 'src/react/ExcalidrawEditable.tsx',
        'remark-plugin': 'src/remark-plugin.ts',
        'vite-plugin': 'src/vite-plugin.ts',
      },
      formats: ['es'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: isExternal,
      output: {
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name].js',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
  esbuild: {
    jsx: 'automatic',
  },
})
