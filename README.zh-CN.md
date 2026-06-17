# @hokkeung/astro-excalidraw-editable 中文文档

在 Astro / MDX 中嵌入 Excalidraw 图，并在开发环境里直接编辑、保存回 `.excalidraw.json` 文件。

## 适合什么场景

- 在技术文章、知识库、组件文档中展示 Excalidraw 图。
- 希望图表源码以 `.excalidraw.json` 文件保存在项目里。
- 希望开发时能直接在页面上编辑图表，保存后自动写回本地文件。
- 生产环境只需要干净的只读预览。

## 安装

```bash
pnpm add @hokkeung/astro-excalidraw-editable @excalidraw/excalidraw
pnpm astro add react
```

`@excalidraw/excalidraw` 需要安装在使用方项目中。这个包内部会直接使用它，但不会把它打包进来。

## 配置 Astro

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

默认配置：

```ts
excalidrawEditable({
  allowedDir: 'src/content/excalidraw',
  allowedSuffix: '.excalidraw.json',
  endpoint: '/__excalidraw_save',
})
```

保存接口只会写入 `allowedDir` 目录下，并且只接受 `allowedSuffix` 后缀的文件。

## 在 MDX 中使用

创建图表文件：

```txt
src/content/excalidraw/demo.excalidraw.json
```

在 MDX 页面中引入组件：

```mdx
---
title: Editable Diagram
---

import Excalidraw from '@hokkeung/astro-excalidraw-editable'

<Excalidraw src="demo" height={520} />
```

`src="demo"` 会被解析到默认目录：

```txt
src/content/excalidraw/demo.excalidraw.json
```

子目录也可以直接写：

```mdx
<Excalidraw src="architecture/frontend" />
```

上面会读取：

```txt
src/content/excalidraw/architecture/frontend.excalidraw.json
```

也可以使用相对路径：

```mdx
<Excalidraw src="../content/excalidraw/demo.excalidraw.json" />
```

## 编辑和保存

组件会在右上角显示放大图标，开发和生产环境都可用。点击后会打开带模糊背景的只读大预览。

开发环境中，如果组件可编辑且有保存路径，还会显示编辑图标。点击后会打开全屏 Excalidraw 编辑器。

- 使用 `Cmd+S` 或 `Ctrl+S` 保存。
- 保存成功后，本地 `.excalidraw.json` 文件会被更新。
- 如果有未保存修改，关闭编辑器前会提示确认。
- 生产环境默认不会显示编辑入口。

## 常用属性

组件支持 `@excalidraw/excalidraw` 的 React props，并额外支持这些属性：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `class` | `string` | - | 外层容器 class。 |
| `dataPath` | `string` | - | 保存时使用的项目内 JSON 路径。 |
| `editable` | `boolean` | `import.meta.env.DEV` | 是否显示编辑入口。 |
| `height` | `number \| string` | `'400px'` | 图表高度，数字会按 px 处理。 |
| `saveEndpoint` | `string` | `'/__excalidraw_save'` | 保存接口地址。 |
| `src` | `string` | - | MDX 中的文件路径简写。 |

通常只需要传 `src` 和 `height`。

## 自定义组件名

如果你在 MDX 中把组件封装成别的名字，可以通过 `componentNames` 让 `src` 转换继续生效：

```ts
excalidrawEditable({
  componentNames: ['Excalidraw', 'MyDiagram'],
})
```

之后可以这样写：

```mdx
<MyDiagram src="demo" />
```

## 导出入口

- `@hokkeung/astro-excalidraw-editable`: Astro 组件。
- `@hokkeung/astro-excalidraw-editable/integration`: Astro integration。
- `@hokkeung/astro-excalidraw-editable/remark-plugin`: MDX `src` 转换插件。
- `@hokkeung/astro-excalidraw-editable/react`: 底层 React 组件。
- `@hokkeung/astro-excalidraw-editable/vite-plugin`: 开发环境保存中间件。
