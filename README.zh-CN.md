# @namelesserlx/editor

面向 Tiptap 的 React 富文本编辑器。

这是一个 batteries-included、JSON-first 的 React 编辑器 SDK，内置默认 UI、只读渲染能力，以及 HTML / Markdown 导入导出能力。

[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Tiptap 3](https://img.shields.io/badge/Tiptap-3-000000)](https://tiptap.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![JSON-first](https://img.shields.io/badge/Content-JSON--first-2563eb)](#-特性)

- [English](README.md)
- [中文](README.zh-CN.md)（当前）

---

## ✨ 特性

- 面向 React 的开箱即用 Tiptap 封装
- JSON-first 内容工作流
- 内置编辑器 UI：toolbar、bubble menu、link popover、color picker
- 适合前台内容展示的只读渲染器
- HTML / Markdown 导入导出工具
- 基于 DOMPurify 的 HTML 净化和 URL 安全辅助能力
- 内置 `zh-CN` 和 `en-US` 语言支持

---

## 🤔 为什么不用原生 Tiptap？

Tiptap 提供编辑器引擎，`@namelesserlx/editor` 提供更适合真实产品接入的上层封装。

如果你希望获得这些能力，这个包会更合适：

- 更少的 React 编辑器集成成本
- 更稳定的 JSON-first API
- 开箱即用的默认 UI
- 独立的只读渲染入口
- 集中的导入导出和安全辅助能力

---

## 📦 安装

```bash
pnpm add @namelesserlx/editor react react-dom
```

---

## 🚀 快速开始

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

---

## 📖 文档

- [Package README](./packages/editor/README.md)
- [格式策略](./packages/editor/docs/formats.md)
- [安全模型](./packages/editor/docs/security.md)
- [I18n](./packages/editor/docs/i18n.md)
- [只读渲染](./packages/editor/docs/readonly-rendering.md)

---

## 🤝 联系与 PR

- 问题反馈或功能建议：[提交 Issue](https://github.com/namelesserlx/namelessler-editor/issues)
- 欢迎贡献代码：[发起 Pull Request](https://github.com/namelesserlx/namelessler-editor/pulls)
- 维护者：[namelesserlx](https://github.com/namelesserlx)
