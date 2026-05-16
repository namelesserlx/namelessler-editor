# @namelesserlx/editor

React Tiptap Rich Text Editor SDK.

A batteries-included, JSON-first rich text editor SDK for React and Tiptap 3 with built-in UI, readonly rendering, and HTML / Markdown import-export.

[![npm version](https://img.shields.io/npm/v/@namelesserlx/editor?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@namelesserlx/editor)
[![npm downloads](https://img.shields.io/npm/dm/@namelesserlx/editor?color=2f855a&logo=npm&logoColor=white)](https://www.npmjs.com/package/@namelesserlx/editor)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Tiptap 3](https://img.shields.io/badge/Tiptap-3-000000)](https://tiptap.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![JSON-first](https://img.shields.io/badge/Content-JSON--first-2563eb)](#-features)
[![License MIT](https://img.shields.io/badge/License-MIT-green.svg)](./packages/editor/LICENSE)

[Live Playground](https://namelesserlx.github.io/namelessler-editor/) ·
[npm Package](https://www.npmjs.com/package/@namelesserlx/editor) ·
[Package Docs](./packages/editor/README.md) ·
[Issues](https://github.com/namelesserlx/namelessler-editor/issues)

- [English](README.md) (Current)
- [中文](README.zh-CN.md)

---

## ✨ Features

- Batteries-included Tiptap wrapper for React
- JSON-first content workflow
- Built-in editor UI: toolbar, bubble menu, link popover, color picker
- Readonly renderer for frontend content pages
- HTML / Markdown import-export helpers
- DOMPurify-based HTML sanitizing and URL safety helpers
- Built-in `zh-CN` and `en-US` locales

---

## 🤔 Why Not Raw Tiptap?

Tiptap is the editor engine. `@namelesserlx/editor` is the product-ready layer on top of it.

Choose this package when you want:

- less editor setup work in React apps
- a stable JSON-first API
- usable default UI out of the box
- a dedicated readonly rendering entry
- one place for import/export and safety helpers

---

## 📦 Installation

```bash
pnpm add @namelesserlx/editor react react-dom
```

---

## 🚀 Quick Start

```tsx
import { useEditorController } from '@namelesserlx/editor/react/controller';
import { Editor } from '@namelesserlx/editor/react/editor';
import { createEmptyDocument } from '@namelesserlx/editor/core/model';
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

---

## 📖 Documentation

- [Package README](./packages/editor/README.md)
- [Format strategy](./packages/editor/docs/formats.md)
- [Security model](./packages/editor/docs/security.md)
- [I18n](./packages/editor/docs/i18n.md)
- [Readonly rendering](./packages/editor/docs/readonly-rendering.md)

---

## 🤝 Contact & PRs

- Questions, ideas, or bug reports: [Open an issue](https://github.com/namelesserlx/namelessler-editor/issues)
- Pull requests are welcome: [Create a pull request](https://github.com/namelesserlx/namelessler-editor/pulls)
- Maintainer: [@namelesserlx](https://github.com/namelesserlx)
