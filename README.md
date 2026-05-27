# @hokkeung/astro-excalidraw-editable

在 Astro / MDX 中嵌入 Excalidraw 图，并在开发环境里直接编辑、保存回 `.excalidraw.json` 文件。

## 特性

- 在页面中渲染只读 Excalidraw 预览。
- 开发环境显示 `编辑` 按钮，打开全屏编辑器。
- `Cmd+S` / `Ctrl+S` 保存修改到本地 JSON 文件。
- 支持 MDX `src` 简写，自动注入 `initialData` 和 `dataPath`。
- 跟随页面 `html.dark` 切换明暗主题。
- 保存接口只允许写入指定目录和指定后缀的文件。

## 安装

```bash
pnpm add @hokkeung/astro-excalidraw-editable @excalidraw/excalidraw
pnpm astro add react
```

## 配置

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

默认只允许保存到 `src/content/excalidraw` 目录下，文件后缀为 `.excalidraw.json`。

需要自定义时：

```ts
excalidrawEditable({
  allowedDir: 'src/content/excalidraw',
  allowedSuffix: '.excalidraw.json',
  endpoint: '/__excalidraw_save',
})
```

## 使用

先准备一个 Excalidraw JSON 文件：

```txt
src/content/excalidraw/demo.excalidraw.json
```

在 MDX 中使用：

```mdx
---
title: Editable Diagram
---

import Excalidraw from '@hokkeung/astro-excalidraw-editable'

<Excalidraw src="demo" height={520} />
```

`src="demo"` 会被解析为：

```txt
src/content/excalidraw/demo.excalidraw.json
```

也可以使用子路径：

```mdx
<Excalidraw src="patterns/singleton" />
```

或直接使用相对路径：

```mdx
<Excalidraw src="../content/excalidraw/demo.excalidraw.json" />
```

开发环境中点击 `编辑` 后打开编辑器，保存会写回对应的 JSON 文件。生产环境默认关闭编辑能力，只显示预览。

## 组件属性

组件支持 `@excalidraw/excalidraw` 的 React props，并额外支持：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `class` | `string` | - | 外层容器 class。 |
| `dataPath` | `string` | - | 保存时使用的项目内 JSON 路径。 |
| `editable` | `boolean` | `import.meta.env.DEV` | 是否显示编辑入口。 |
| `height` | `number \| string` | `'400px'` | 图表高度，数字会按 px 处理。 |
| `saveEndpoint` | `string` | `'/__excalidraw_save'` | 保存接口地址。 |
| `src` | `string` | - | MDX 中的文件路径简写。 |

## 可用导出

- `@hokkeung/astro-excalidraw-editable`: Astro 组件。
- `@hokkeung/astro-excalidraw-editable/integration`: Astro integration。
- `@hokkeung/astro-excalidraw-editable/remark-plugin`: MDX `src` 转换插件。
- `@hokkeung/astro-excalidraw-editable/react`: 底层 React 组件。
- `@hokkeung/astro-excalidraw-editable/vite-plugin`: 开发环境保存中间件。

## 本地开发

```bash
pnpm install
pnpm build
pnpm example:dev
```
