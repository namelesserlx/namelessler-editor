# @namelesserlx/editor Playground

[中文](./README.md)

This is the official playground for `@namelesserlx/editor`. It demonstrates how the editor package can be integrated into a real React app. The playground is not the package itself; it is a static demo site that can be deployed to GitHub Pages.

## What This Playground Shows

- Importing the package default styles with `@namelesserlx/editor/style.css`
- Composing editor behavior with `useEditorController` and `Editor`
- Adding CodeBlock Pro, Drag Handle, File Upload, and custom AI autocomplete extensions
- Adding custom AI actions to the bubble menu
- Using a resizable document Q&A sidebar
- Exporting content as Markdown, HTML, and JSON
- Keeping separate Chinese and English UI copy, plus separate Chinese and English initial documents

## Local Development

Run from the repository root:

```bash
pnpm --filter @namelesserlx/editor-playground dev
```

Build the static app:

```bash
pnpm --filter @namelesserlx/editor-playground build
```

Preview the production build:

```bash
pnpm --filter @namelesserlx/editor-playground preview
```

## Internationalization

The playground uses `i18next` and `react-i18next`.

- Default README: Chinese
- Supported languages: `zh-CN`, `en-US`
- First visit: detected from the browser language
- Manual switching: language buttons in the top bar
- Persistence: saved to `localStorage` when available; switching still works in storage-restricted contexts
- Editor built-in UI locale: follows the selected playground language

Related files:

```text
src/i18n.ts
src/data/init.zh-CN.json
src/data/init.en-US.json
```

When the document has not been edited yet, switching language also switches the initial demo document. Once the user has edited the document, language switching only changes the UI copy and does not overwrite user content.

## AI Configuration

The playground does not ship with a default AI key. Open **AI Settings** in the top bar, choose Google Gemini or DeepSeek, and enter your own API key.

The API key is stored in the current browser tab session via `sessionStorage`. It is cleared when the tab is closed, so the public GitHub Pages build does not embed a shared key in the frontend bundle.

## Styling Notes

The playground uses Tailwind CSS v4 and a small local shadcn-style token set. Unused sidebar/chart tokens have been removed so the demo does not carry meaningless variables.

The package styles are separate from the playground styles. Real consumers of the npm package should still only need:

```ts
import '@namelesserlx/editor/style.css';
```
