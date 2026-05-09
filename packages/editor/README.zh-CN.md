# @namelesserlx/editor

面向 Tiptap 的 React 富文本编辑器，内置默认 UI、只读渲染能力、JSON-first 内容工作流，以及 HTML / Markdown 导入导出能力。

- [English](README.md)
- [中文](README.zh-CN.md) (当前)

---

## ✨ 特性

- ⚛️ **React 优先的编辑器 SDK**：基于 React 19，提供 `useEditorController`
- 🧱 **开箱即用的默认 UI**：内置 toolbar、bubble menu、link popover 和 color picker
- 🗂️ **JSON-first 工作流**：以 Tiptap JSON 作为唯一可信内容源
- 👀 **只读渲染器**：适合前台内容展示页的独立渲染入口
- 🔄 **HTML / Markdown 支持**：覆盖常见内容导入导出场景
- 🔒 **安全辅助能力**：基于 DOMPurify 的 HTML 净化和 URL 安全辅助能力
- 🌍 **内置语言支持**：提供 `en-US` 和 `zh-CN`
- 🧩 **可扩展**：支持接入你自己的 Tiptap extensions，并配置内置能力

---

## 📦 安装

```bash
pnpm add @namelesserlx/editor react react-dom
```

本包是 **ESM-only**，面向现代 React + bundler 环境。

默认样式**不会自动注入**。如果要使用内置 UI，请手动引入样式文件：

```tsx
import '@namelesserlx/editor/style.css';
```

---

## 🚀 基本用法

```tsx
import { Editor, useEditorController } from '@namelesserlx/editor/react';
import { createEmptyDocument } from '@namelesserlx/editor/core';
import '@namelesserlx/editor/style.css';

const controller = useEditorController({
  defaultContent: createEmptyDocument(),
  contentFormat: 'json',
  locale: 'zh-CN',
});

export function App() {
  return (
    <Editor
      controller={controller}
      ui={{
        toolbar: true,
        bubbleMenu: true,
        linkPopover: true,
        colorPicker: true,
      }}
    />
  );
}
```

常见的保存流程：

```tsx
async function save() {
  await saveArticle(controller.getJSON());
}
```

---

## 👀 只读渲染

如果你希望渲染已存储的内容，而不引入编辑态入口，建议使用独立的只读入口：

```tsx
import { ReadonlyRenderer } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';

export function ArticleBody({ content }: { content: unknown }) {
  return <ReadonlyRenderer content={content} contentFormat="json" />;
}
```

`@namelesserlx/editor/react` 也会为了方便而导出 `ReadonlyRenderer`，但如果你更在意 bundle 边界，推荐优先使用 `/readonly`。

---

## 🔄 HTML / Markdown 支持

`@namelesserlx/editor` 是 **JSON-first** 的。Tiptap JSON 是唯一无损的内部格式；HTML 和 Markdown 只是导入 / 导出格式。

```ts
import { exportEditorContent, importEditorContent } from '@namelesserlx/editor/core';

const json = importEditorContent(markdown, {
  from: 'markdown',
}).value;

const html = exportEditorContent(json, {
  to: 'html',
}).value;
```

格式转换工具会返回：

- `value`：转换后的结果
- `warnings`：有损或不受支持的转换警告
- `stats.durationMs`：转换耗时
- `stats.lossy`：是否在转换过程中丢失结构

---

## 🧩 自定义扩展

业务专属 extensions 应该放在宿主应用里，通过 `extensions` 传入；通过 `editorOptions` 可以配置 SDK 内置的 extension 能力。

```tsx
import { Editor, useEditorController } from '@namelesserlx/editor/react';
import { CodeBlockPro } from '@tiptap-codeless/extension-code-block-pro';
import { FileUpload } from '@tiptap-codeless/extension-file-upload';

const controller = useEditorController({
  defaultContent: content,
  extensions: [
    CodeBlockPro.configure({ defaultLanguage: 'javascript', theme: 'auto' }),
    FileUpload.configure({ storageMode: 'custom', upload }),
  ],
  editorOptions: {
    features: {
      codeBlock: false,
    },
  },
});

export function App() {
  return <Editor controller={controller} />;
}
```

如果你的自定义 schema 需要在所有路径保持一致，请把相同的 `extensions` 和 `editorOptions` 同时传给 `ReadonlyRenderer`、`importEditorContent`、`exportEditorContent` 和 `normalizeEditorContent`。

---

## ⚙️ 配置项

### `useEditorController(...)`

| 选项                  | 类型                             | 默认值                  | 描述                         |
| --------------------- | -------------------------------- | ----------------------- | ---------------------------- |
| `defaultContent`      | `EditorValue`                    | `createEmptyDocument()` | 初始内容                     |
| `contentFormat`       | `'json' \| 'html' \| 'markdown'` | `'json'`                | `defaultContent` 的格式      |
| `readonly`            | `boolean`                        | `false`                 | 是否以只读模式启动           |
| `autofocus`           | `boolean`                        | `false`                 | 挂载后自动聚焦               |
| `placeholder`         | `string`                         | `undefined`             | 空内容占位文案               |
| `contentClassName`    | `string`                         | `undefined`             | 内容区域附加类名             |
| `locale`              | `'en-US' \| 'zh-CN'`             | `'en-US'`               | 内置 UI 语言                 |
| `extensions`          | `Extensions`                     | `[]`                    | 业务自定义 Tiptap extensions |
| `editorOptions`       | `CreateEditorExtensionsOptions`  | `{}`                    | 配置内置 extension 工厂      |
| `attributeSanitizers` | `EditorAttributeSanitizers`      | `undefined`             | 自定义属性净化钩子           |
| `htmlPolicy`          | `HtmlPolicy`                     | 安全默认值              | HTML 和 iframe 安全策略      |
| `onReady`             | `(editor) => void`               | `undefined`             | 编辑器实例就绪时触发         |
| `onFocus`             | `(editor) => void`               | `undefined`             | 聚焦回调                     |
| `onBlur`              | `(editor) => void`               | `undefined`             | 失焦回调                     |
| `onUpdate`            | `(meta) => void`                 | `undefined`             | 文档更新后触发               |

### `<Editor />` 的 `ui`

```tsx
<Editor
  controller={controller}
  ui={{
    toolbar: true,
    bubbleMenu: {
      enabled: true,
      zIndex: 9999,
    },
    linkPopover: true,
    colorPicker: true,
  }}
/>
```

| 选项          | 类型                                                                 | 默认值               | 描述                        |
| ------------- | -------------------------------------------------------------------- | -------------------- | --------------------------- |
| `toolbar`     | `boolean`                                                            | `true`               | 是否显示默认工具栏          |
| `bubbleMenu`  | `boolean \| { enabled?: boolean; zIndex?: number; shouldShow?: fn }` | 启用，`zIndex: 9999` | 控制选区浮层菜单            |
| `linkPopover` | `boolean`                                                            | `true`               | 是否显示链接编辑浮层        |
| `colorPicker` | `boolean`                                                            | `true`               | 是否显示文字 / 背景色选择器 |

### `editorOptions.features`

```ts
{
    links: true,
    codeBlock: true,
    tables: true,
    taskList: true,
    iframe: false,
    color: true,
    highlight: true,
    underline: true,
    textAlign: true,
}
```

这些开关可以让你按需禁用或定制内置的 extension 能力，而不用整套替换编辑器。

---

## 🔒 安全

这个包提供的是客户端内容解析和渲染的安全边界：

- HTML 净化
- URL 策略辅助
- iframe allowlist 策略
- 受控的 HTML 导入 / 导出边界

默认行为包括：

- 移除脚本和内联事件处理器
- 移除内联 `style`
- 拒绝 `javascript:` 这类危险 URL
- 默认禁用 iframe

这个包**不负责**替代服务端校验、上传安全或业务 API 安全控制。

---

## 📚 包入口

- `@namelesserlx/editor` - 顶层便捷导出
- `@namelesserlx/editor/react` - 编辑器组件、controller hook、只读组件便捷导出
- `@namelesserlx/editor/readonly` - 不带编辑入口的只读渲染器
- `@namelesserlx/editor/core` - 内容工具和 extension 工厂
- `@namelesserlx/editor/format` - HTML / Markdown 转换工具
- `@namelesserlx/editor/security` - HTML 和 URL 安全辅助工具
- `@namelesserlx/editor/i18n` - 语言常量和消息解析能力
- `@namelesserlx/editor/ui` - 可选默认 UI 基础能力
- `@namelesserlx/editor/style.css` - 默认样式

---

## 📖 文档

- [格式策略](./docs/formats.md)
- [安全模型](./docs/security.md)
- [I18n](./docs/i18n.md)
- [只读渲染](./docs/readonly-rendering.md)
