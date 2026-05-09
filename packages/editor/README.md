# @namelesserlx/editor

React Rich Text Editor for Tiptap with built-in UI, readonly rendering, JSON-first content workflows, and HTML / Markdown import-export.

- [English](README.md) (Current)
- [中文](https://github.com/namelesserlx/namelessler-editor/blob/main/packages/editor/README.zh-CN.md)

---

## ✨ Features

- ⚛️ **React-first editor SDK**: Built for React 19 with `useEditorController`
- 🧱 **Batteries-included UI**: Toolbar, bubble menu, link popover, and color picker out of the box
- 🗂️ **JSON-first workflow**: Treats Tiptap JSON as the source of truth
- 👀 **Readonly renderer**: Separate rendering entry for frontend content pages
- 🔄 **HTML / Markdown support**: Import and export helpers for common content workflows
- 🔒 **Security helpers**: DOMPurify-based HTML sanitizing and URL safety helpers
- 🌍 **Built-in locales**: Ships with `en-US` and `zh-CN`
- 🧩 **Extensible**: Add your own Tiptap extensions and configure built-in features

---

## 📦 Installation

```bash
pnpm add @namelesserlx/editor react react-dom
```

This package is **ESM-only** and targets modern React + bundler setups.

Default styles are **not** auto-injected. Import the stylesheet when using the built-in UI:

```tsx
import '@namelesserlx/editor/style.css';
```

---

## 🚀 Basic Usage

```tsx
import { Editor, useEditorController } from '@namelesserlx/editor/react';
import { createEmptyDocument } from '@namelesserlx/editor/core';
import '@namelesserlx/editor/style.css';

const controller = useEditorController({
  defaultContent: createEmptyDocument(),
  contentFormat: 'json',
  locale: 'en-US',
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

Typical save flow:

```tsx
async function save() {
  await saveArticle(controller.getJSON());
}
```

---

## 👀 Readonly Rendering

Use the dedicated readonly entry when you want to render stored content without importing the editing entry:

```tsx
import { ReadonlyRenderer } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';

export function ArticleBody({ content }: { content: unknown }) {
  return <ReadonlyRenderer content={content} contentFormat="json" />;
}
```

`@namelesserlx/editor/react` also re-exports `ReadonlyRenderer` for convenience, but `/readonly` is the preferred display-focused entry when bundle boundaries matter.

---

## 🔄 HTML / Markdown Support

`@namelesserlx/editor` is **JSON-first**. Tiptap JSON is the only lossless internal format; HTML and Markdown are import / export formats.

```ts
import { exportEditorContent, importEditorContent } from '@namelesserlx/editor/core';

const json = importEditorContent(markdown, {
  from: 'markdown',
}).value;

const html = exportEditorContent(json, {
  to: 'html',
}).value;
```

Format helpers return:

- `value`: converted result
- `warnings`: lossy or unsupported conversion warnings
- `stats.durationMs`: measured conversion time
- `stats.lossy`: whether structure was dropped during conversion

---

## 🧩 Custom Extensions

Business-specific extensions belong in the consuming app. Pass them through `extensions`, and use `editorOptions` to configure the SDK's built-in feature set.

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

Use the same `extensions` and `editorOptions` for `ReadonlyRenderer`, `importEditorContent`, `exportEditorContent`, and `normalizeEditorContent` when custom schema support must stay consistent across all paths.

---

## ⚙️ Configuration Options

### `useEditorController(...)`

| Option                | Type                             | Default                 | Description                              |
| --------------------- | -------------------------------- | ----------------------- | ---------------------------------------- |
| `defaultContent`      | `EditorValue`                    | `createEmptyDocument()` | Initial editor content                   |
| `contentFormat`       | `'json' \| 'html' \| 'markdown'` | `'json'`                | Format of `defaultContent`               |
| `readonly`            | `boolean`                        | `false`                 | Start in readonly mode                   |
| `autofocus`           | `boolean`                        | `false`                 | Focus the editor on mount                |
| `placeholder`         | `string`                         | `undefined`             | Placeholder text for empty content       |
| `contentClassName`    | `string`                         | `undefined`             | Extra class for the content area         |
| `locale`              | `'en-US' \| 'zh-CN'`             | `'en-US'`               | Built-in UI locale                       |
| `extensions`          | `Extensions`                     | `[]`                    | App-owned Tiptap extensions              |
| `editorOptions`       | `CreateEditorExtensionsOptions`  | `{}`                    | Configure built-in extension factory     |
| `attributeSanitizers` | `EditorAttributeSanitizers`      | `undefined`             | Custom attribute sanitizing hooks        |
| `htmlPolicy`          | `HtmlPolicy`                     | safe defaults           | HTML and iframe safety policy            |
| `onReady`             | `(editor) => void`               | `undefined`             | Called when the editor instance is ready |
| `onFocus`             | `(editor) => void`               | `undefined`             | Focus callback                           |
| `onBlur`              | `(editor) => void`               | `undefined`             | Blur callback                            |
| `onUpdate`            | `(meta) => void`                 | `undefined`             | Called after document updates            |

### `ui` on `<Editor />`

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

| Option        | Type                                                                 | Default                 | Description                       |
| ------------- | -------------------------------------------------------------------- | ----------------------- | --------------------------------- |
| `toolbar`     | `boolean`                                                            | `true`                  | Show the default toolbar          |
| `bubbleMenu`  | `boolean \| { enabled?: boolean; zIndex?: number; shouldShow?: fn }` | enabled, `zIndex: 9999` | Control the selection bubble menu |
| `linkPopover` | `boolean`                                                            | `true`                  | Show link editing popover         |
| `colorPicker` | `boolean`                                                            | `true`                  | Show text/background color picker |

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

These flags let you disable or customize parts of the built-in extension stack without replacing the rest of the editor.

---

## 🔒 Security

The package provides client-side safety boundaries for content parsing and rendering:

- HTML sanitizing with DOMPurify
- URL policy helpers
- iframe allowlist policy
- sanitized HTML import / export boundaries

Default behavior:

- removes scripts and inline event handlers
- removes inline `style`
- rejects dangerous URLs such as `javascript:`
- disables iframe unless explicitly enabled

This package does **not** replace server-side validation, upload security, or business API security.

---

## 📚 Package Entry Points

- `@namelesserlx/editor` - top-level convenience exports
- `@namelesserlx/editor/react` - editor component, controller hook, convenience readonly export
- `@namelesserlx/editor/readonly` - readonly renderer without the editing entry
- `@namelesserlx/editor/core` - content helpers and extension factory
- `@namelesserlx/editor/format` - HTML / Markdown conversion helpers
- `@namelesserlx/editor/security` - HTML and URL safety helpers
- `@namelesserlx/editor/i18n` - locale constants and message resolver
- `@namelesserlx/editor/ui` - optional default UI primitives
- `@namelesserlx/editor/style.css` - default styles

---

## 📖 Documentation

- [Format strategy](./docs/formats.md)
- [Security model](./docs/security.md)
- [I18n](./docs/i18n.md)
- [Readonly rendering](./docs/readonly-rendering.md)
