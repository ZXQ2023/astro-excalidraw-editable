import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import { excalidrawEditable } from '@hokkeung/astro-excalidraw-editable/integration'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    react(),
    mdx(),
    excalidrawEditable({
      allowedDir: 'src/content/excalidraw',
    }),
  ],
})
