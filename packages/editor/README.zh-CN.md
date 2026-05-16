# @namelesserlx/editor

面向 Tiptap 的 React 富文本编辑器，内置默认 UI、只读渲染能力、JSON-first 内容工作流，以及 HTML / Markdown 导入导出能力。

- [English](README.md)
- [中文](README.zh-CN.md) (当前)

[在线示例](https://namelesserlx.github.io/namelessler-editor/) ·
[源码仓库](https://github.com/namelesserlx/namelessler-editor) ·
[问题反馈](https://github.com/namelesserlx/namelessler-editor/issues)

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
pnpm add @namelesserlx/editor react react-dom \
  @tiptap/core @tiptap/react @tiptap/pm \
  @tiptap/starter-kit @tiptap/html @tiptap/markdown \
  @tiptap/extension-code-block-lowlight @tiptap/extension-highlight \
  @tiptap/extension-link @tiptap/extension-table \
  @tiptap/extension-task-item @tiptap/extension-task-list \
  @tiptap/extension-text-align @tiptap/extension-text-style \
  @tiptap/extension-underline
```

本包是 **ESM-only**，面向现代 React + bundler 环境。

这个 SDK 直接引用的 `@tiptap/*` runtime 包都会作为 peer dependencies 交给宿主应用安装。这样 SDK、内置 UI、只读渲染、导入导出工具和业务自定义 extensions 会共用同一套 Tiptap / ProseMirror runtime。宿主应用里这些显式 peer 包应该保持在同一条兼容的 Tiptap v3 版本线上，不要让这个包下面再出现第二套嵌套的 Tiptap。

默认样式**不会自动注入**。如果要使用内置 UI，请手动引入样式文件：

```tsx
import '@namelesserlx/editor/style.css';
```

---

## 🚀 基本用法

```tsx
import { useEditorController } from '@namelesserlx/editor/react/controller';
import { Editor } from '@namelesserlx/editor/react/editor';
import { createEmptyDocument } from '@namelesserlx/editor/core/model';
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

只读渲染的核心能力是把 Tiptap JSON / HTML / Markdown 同步转换成安全 HTML，适合 SSR、SEO、缓存和前台内容展示页：

```tsx
import { ReadonlyHtml, renderReadonlyHtml } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';

export function ArticleBody({ content }: { content: unknown }) {
  const html = renderReadonlyHtml(content, {
    contentFormat: 'json',
  }).value;

  return <ReadonlyHtml html={html} />;
}
```

如果只是后台预览或客户端内嵌展示，也可以直接使用 React 薄壳组件：

```tsx
import { ReadonlyRenderer } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';

export function ArticleBody({ content }: { content: unknown }) {
  return <ReadonlyRenderer content={content} contentFormat="json" />;
}
```

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

### Markdown 粘贴

React 编辑器默认会解析剪贴板里的 Markdown。它会处理明确的 `text/markdown` /
`text/x-markdown` 剪贴板数据；如果剪贴板没有提供 HTML，也会识别看起来像 Markdown 的
`text/plain`。

普通长文本会交给 ProseMirror 默认粘贴流程，避免在包内额外解析造成输入卡顿。较长的
Markdown 粘贴也不会强制把视口滚到粘贴内容末尾。

如果你的产品希望所有纯文本粘贴都保持字面量，可以关闭 Markdown 粘贴解析：

```tsx
const controller = useEditorController({
  markdownPaste: false,
});
```

---

## 🧩 自定义扩展

业务专属 extensions 应该放在宿主应用里，通过 `extensions` 传入；通过 `editorOptions` 可以配置 SDK 内置的 extension 能力。

自定义 extensions 应该从应用级 peer runtime 解析同一组 `@tiptap/core` 与 `@tiptap/pm`。这样 editing、只读渲染、导入导出路径里的 extension 实例、schema、commands 和 ProseMirror state class 才能保持一致。

```tsx
import { useEditorController } from '@namelesserlx/editor/react/controller';
import { Editor } from '@namelesserlx/editor/react/editor';
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
| `markdownPaste`       | `boolean`                        | `true`                  | 是否解析 Markdown 粘贴内容   |
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
    toolbar: {
      enabled: true,
      commands: (defaults) => defaults.filter((command) => command.id !== 'heading-3'),
      slots: [
        {
          key: 'ai',
          placement: 'end',
          render: () => <button type="button">AI</button>,
        },
      ],
    },
    bubbleMenu: {
      enabled: true,
      zIndex: 9999,
      commands: (defaults) => [
        ...defaults.filter((command) => command.id !== 'blockquote'),
        {
          id: 'ai-polish',
          group: 'ai',
          render: ({ activePopover, closePopovers, setPopoverOpen }) => (
            <span>
              <button
                type="button"
                aria-expanded={activePopover === 'ai-polish'}
                onClick={() => setPopoverOpen('ai-polish')(activePopover !== 'ai-polish')}
              >
                AI
              </button>
              {activePopover === 'ai-polish' ? (
                <span role="dialog">
                  自定义 AI 操作
                  <button type="button" onClick={closePopovers}>
                    关闭
                  </button>
                </span>
              ) : null}
            </span>
          ),
        },
      ],
    },
    tooltip: {
      enabled: true,
      delay: 300,
      placement: 'top',
    },
    linkPopover: true,
    colorPicker: {
      enabled: true,
      textColors: [
        { key: 'clear', label: '清除', value: null },
        { key: 'brand', label: '品牌色', value: '#6d28d9' },
      ],
      renderSwatch: ({ label }) => <span>{label}</span>,
    },
  }}
/>
```

| 选项          | 类型                                                                                                                                 | 默认值               | 描述                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ---------------------------------- |
| `toolbar`     | `boolean \| { enabled?: boolean; commands?: registry; slots?: ToolbarSlot[] }`                                                       | `true`               | 显示、移除、重排或扩展默认工具栏   |
| `bubbleMenu`  | `boolean \| { enabled?: boolean; zIndex?: number; shouldShow?: fn; commands?: registry }`                                            | 启用，`zIndex: 9999` | 显示、移除、重排或扩展选区菜单命令 |
| `tooltip`     | `boolean \| { enabled?: boolean; delay?: number; placement?: 'top' \| 'bottom' }`                                                    | 启用，`delay: 300`   | 默认 UI 的 portal 悬浮提示         |
| `linkPopover` | `boolean`                                                                                                                            | `true`               | 是否显示链接编辑浮层               |
| `colorPicker` | `boolean \| { enabled?: boolean; textColors?: ColorOption[]; backgroundColors?: ColorOption[]; renderSwatch?: ColorSwatchRenderer }` | `true`               | 显示或自定义文字 / 背景色选择器    |

默认 toolbar 和 bubble menu 会提供正文以及 H1-H4 标题。底层文档模型支持 1-6 级标题，如果业务产品需要 H5/H6，可以通过 command registry 自行加入。

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

## 📚 公开 API

这个包只暴露文档中列出的公开入口。业务代码优先使用明确子路径；如果你想最短路径接入完整编辑器，可以使用 `/react`。

| 入口                                    | 公开 API                                                                                                                                                | 适用场景                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `@namelesserlx/editor/react`            | `Editor`、`EditorRoot`、`useEditorController`                                                                                                           | 想用最短路径接入完整编辑器                     |
| `@namelesserlx/editor/react/controller` | `useEditorController`；`EditorController`、`EditorUpdateMeta`、`UseEditorControllerOptions` 类型                                                        | 只需要 controller hook，不希望引入默认 UI 图谱 |
| `@namelesserlx/editor/react/editor`     | `Editor`、`EditorRoot`；`EditorProps`、`AnyEditorProps` 类型                                                                                            | 只需要 React 编辑器组件                        |
| `@namelesserlx/editor/readonly`         | `renderReadonlyHtml`、`ReadonlyHtml`、`ReadonlyRenderer`；只读渲染相关类型                                                                              | 内容页、SSR、预览或缓存展示 HTML               |
| `@namelesserlx/editor/core/model`       | `createEmptyDocument`、`createNormalizeOptions`、`isEditorJson`、`normalizeEditorJson`；模型相关类型                                                    | 只需要 JSON 文档模型工具                       |
| `@namelesserlx/editor/core/extensions`  | `createEditorExtensions`、`createLowlight`、`createLowlightRegistry`、`IframeEmbed`；extension 配置类型                                                 | 配置或复用内置 Tiptap extension 栈             |
| `@namelesserlx/editor/core`             | 内容工具，以及 model / extensions 能力                                                                                                                  | 需要完整 core 能力                             |
| `@namelesserlx/editor/format`           | `importContent`、`exportContent`、`importHtml`、`exportHtml`、`importMarkdown`、`exportMarkdown`                                                        | 直接做 HTML / Markdown / JSON 转换             |
| `@namelesserlx/editor/security`         | `sanitizeHtml`、`sanitizeUrl`；安全策略类型                                                                                                             | 需要 HTML 或 URL 安全辅助能力                  |
| `@namelesserlx/editor/i18n`             | `DEFAULT_EDITOR_LOCALE`、`SUPPORTED_EDITOR_LOCALES`；locale 类型                                                                                        | 需要支持语言元信息                             |
| `@namelesserlx/editor/ui`               | 默认 UI primitives、命令注册表与颜色类型，例如 `DEFAULT_BUBBLE_MENU_COMMANDS`、`BubbleMenuCommand`、`ColorOption`、`BubbleMenuSelect`、`TooltipTrigger` | 组合内置 UI 组件                               |
| `@namelesserlx/editor`                  | core、format、i18n、security 的轻量顶层便捷导出                                                                                                         | 推荐优先使用子路径来获得可预测 bundle          |
| `@namelesserlx/editor/style.css`        | 默认 CSS                                                                                                                                                | 使用内置编辑器或只读样式                       |

---

## 📖 文档

- [格式策略](./docs/formats.md)
- [安全模型](./docs/security.md)
- [I18n](./docs/i18n.md)
- [只读渲染](./docs/readonly-rendering.md)
