# @hokkeung/astro-excalidraw-editable

Embed Excalidraw diagrams in Astro pages and MDX content, with a development-only editor that can save changes back to `.excalidraw.json` files through a Vite middleware endpoint.

## Features

- Astro component wrapper around `@excalidraw/excalidraw`.
- Read-only previews in production, editable overlays in development.
- Theme follows the page-level `html.dark` class.
- `Cmd+S` / `Ctrl+S` saves edited diagrams to disk during `astro dev`.
- Save middleware restricts writes to an allowed directory and file suffix.

## Install

```bash
pnpm add @hokkeung/astro-excalidraw-editable @excalidraw/excalidraw @astrojs/react react react-dom
```

This package expects Astro 5 and the Astro React integration. React is a peer
dependency because `@excalidraw/excalidraw` is a React component; it is not
bundled into this package. React 17, 18, and 19 are supported by the peer range.

## Configure Astro

```ts
// astro.config.ts
import react from '@astrojs/react'
import { excalidrawEditable } from '@hokkeung/astro-excalidraw-editable/integration'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    react(),
    excalidrawEditable({
      allowedDir: 'src/content/excalidraw',
      allowedSuffix: '.excalidraw.json',
      endpoint: '/__excalidraw_save',
    }),
  ],
})
```

All options are optional. By default, the save endpoint only accepts files under `src/content/excalidraw` whose names end with `.excalidraw.json`.

## Use In MDX

```mdx
---
title: Editable Diagram
---

import Excalidraw from '@hokkeung/astro-excalidraw-editable'

<Excalidraw
  src="../content/excalidraw/demo.excalidraw.json"
  height={520}
/>
```

The integration includes a remark plugin that rewrites string `src` props at
compile time. The example above becomes an imported JSON scene plus a
repository-relative `dataPath`, so the diagram data and save path stay in sync.
Shorthand values are also supported relative to `allowedDir`:

```mdx
<Excalidraw src="demo" />
<Excalidraw src="patterns/singleton" />
```

In development, the component shows an `编辑` button when `dataPath` is provided. Clicking it opens the full-screen editor. Saving posts the serialized Excalidraw scene to the configured endpoint.

In production, `editable` defaults to `false`, so the same component renders a clean, non-interactive preview.

## Component Props

The default export accepts all Excalidraw React props plus:

| Prop           | Type               | Default                | Description                                                       |
| -------------- | ------------------ | ---------------------- | ----------------------------------------------------------------- |
| `class`        | `string`           | `undefined`            | Extra class for the wrapper element.                              |
| `dataPath`     | `string`           | `undefined`            | Repository-relative JSON file path used by the dev save endpoint. |
| `editable`     | `boolean`          | `import.meta.env.DEV`  | Whether to show the edit button and editor overlay.               |
| `height`       | `number \| string` | `'400px'`              | Wrapper height. Numbers are treated as pixels.                    |
| `saveEndpoint` | `string`           | `'/__excalidraw_save'` | Client-side endpoint used when saving.                            |
| `src`          | `string`           | `undefined`            | MDX-only shorthand transformed into `initialData` and `dataPath`. |

## Integration Options

```ts
interface ExcalidrawEditableOptions {
  allowedDir?: string
  allowedSuffix?: string
  componentNames?: string[]
  endpoint?: string
}
```

If you change `endpoint`, pass the same value to `saveEndpoint` only when you need a per-component override. Most projects can configure the endpoint once through the integration.

## Exports

- `@hokkeung/astro-excalidraw-editable`: Astro component.
- `@hokkeung/astro-excalidraw-editable/integration`: Astro integration.
- `@hokkeung/astro-excalidraw-editable/remark-plugin`: MDX `src` transform.
- `@hokkeung/astro-excalidraw-editable/react`: underlying React component and prop type.
- `@hokkeung/astro-excalidraw-editable/vite-plugin`: Vite middleware plugin.

## Build

```bash
pnpm --filter @hokkeung/astro-excalidraw-editable build
```

The build writes JavaScript, source maps, and `.d.ts` files to `dist/`, and copies the Astro component entry as `dist/Excalidraw.astro`.

## Publish

```bash
pnpm --filter @hokkeung/astro-excalidraw-editable release -- --dry-run
pnpm --filter @hokkeung/astro-excalidraw-editable release
```

The release script builds the package, packs the exact tarball into `.release/`,
checks that the version has not already been published, and publishes that
tarball to npm. Pass npm options through after `--`, for example
`--tag next`, `--otp 123456`, or `--provenance`.
