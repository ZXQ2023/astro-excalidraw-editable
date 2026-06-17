# @hokkeung/astro-excalidraw-editable

Embed Excalidraw diagrams in Astro and MDX, with a development-only editor that saves changes back to `.excalidraw.json` files.

[中文文档](./README.zh-CN.md)

## Features

- Render clean, read-only Excalidraw previews in pages.
- Show an `编辑` button in development and open a full-screen editor.
- Save local JSON changes with `Cmd+S` / `Ctrl+S`.
- Support MDX `src` shorthand and automatically inject `initialData` and `dataPath`.
- Follow the page-level `html.dark` class for dark mode.
- Restrict dev saves to an allowed directory and file suffix.

## Install

```bash
pnpm add @hokkeung/astro-excalidraw-editable @excalidraw/excalidraw
pnpm astro add react
```

`@excalidraw/excalidraw` must be installed in the consuming project because this package uses it as a peer dependency.

## Configure Astro

```ts
// astro.config.ts
import react from '@astrojs/react'
import { excalidrawEditable } from '@hokkeung/astro-excalidraw-editable/integration'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    react(),
    excalidrawEditable(),
  ],
})
```

By default, edited files can only be saved under `src/content/excalidraw`, and filenames must end with `.excalidraw.json`.

Customize the integration when needed:

```ts
excalidrawEditable({
  allowedDir: 'src/content/excalidraw',
  allowedSuffix: '.excalidraw.json',
  endpoint: '/__excalidraw_save',
})
```

## Use In MDX

Create an Excalidraw JSON file:

```txt
src/content/excalidraw/demo.excalidraw.json
```

Use the component in MDX:

```mdx
---
title: Editable Diagram
---

import Excalidraw from '@hokkeung/astro-excalidraw-editable'

<Excalidraw src="demo" height={520} />
```

`src="demo"` resolves to:

```txt
src/content/excalidraw/demo.excalidraw.json
```

Subpaths are supported:

```mdx
<Excalidraw src="patterns/singleton" />
```

You can also use a relative path:

```mdx
<Excalidraw src="../content/excalidraw/demo.excalidraw.json" />
```

Click `放大` in any environment to open a larger read-only preview over a blurred backdrop.

In development, click `编辑` to open the editor when the component is editable and has a save path. Saving writes the updated scene back to the JSON file. In production, editing is disabled by default and the component renders a read-only preview.

## Component Props

The component accepts the React props from `@excalidraw/excalidraw`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | `string` | - | Extra class for the wrapper element. |
| `dataPath` | `string` | - | Project-relative JSON path used for saving. |
| `editable` | `boolean` | `import.meta.env.DEV` | Whether to show the edit entry. |
| `height` | `number \| string` | `'400px'` | Diagram height. Numbers are treated as pixels. |
| `saveEndpoint` | `string` | `'/__excalidraw_save'` | Client-side save endpoint. |
| `src` | `string` | - | MDX file path shorthand. |

## Exports

- `@hokkeung/astro-excalidraw-editable`: Astro component.
- `@hokkeung/astro-excalidraw-editable/integration`: Astro integration.
- `@hokkeung/astro-excalidraw-editable/remark-plugin`: MDX `src` transform.
- `@hokkeung/astro-excalidraw-editable/react`: underlying React component.
- `@hokkeung/astro-excalidraw-editable/vite-plugin`: development save middleware.
