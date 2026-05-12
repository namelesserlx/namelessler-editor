# Format Strategy

`@namelesserlx/editor` is JSON-first. Tiptap JSON is the only internal source of truth; HTML and Markdown are import/export formats.

## Data Flow

```text
Markdown -> Tiptap JSON -> Markdown
HTML     -> Tiptap JSON -> HTML
JSON     -> Tiptap JSON -> JSON
```

The package does not treat Markdown or HTML as lossless storage formats. Store JSON, then export HTML or Markdown only when the product needs it.

## React Editor Defaults

```tsx
import { useEditorController } from '@namelesserlx/editor/react/controller';
import { Editor } from '@namelesserlx/editor/react/editor';
import { createEmptyDocument } from '@namelesserlx/editor/core/model';

const editor = useEditorController({
  defaultContent: createEmptyDocument(),
  contentFormat: 'json',
});

<Editor controller={editor} />;

async function save() {
  await saveJson(editor.getJSON());
}
```

Defaults:

- `contentFormat`: `json`
- live editing stays inside Tiptap / ProseMirror `EditorState`
- full JSON is read only when callers explicitly invoke `editor.getJSON()`

For low input latency, do not mirror the full document into React state on every input. Convert to JSON, HTML, or Markdown on save, preview, import, export, or background jobs.

## Import And Export

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
- `stats.lossy`: whether the conversion dropped unsupported structure

## Markdown

Markdown support uses `@tiptap/markdown` with GFM enabled. The v1 baseline covers:

- headings and paragraphs
- bold, italic, strike, inline code, links
- fenced code blocks with language
- bullet and ordered lists
- task lists
- tables
- blockquotes and horizontal rules

Raw HTML inside Markdown is stripped before parsing.

## Custom Markdown Syntax

Custom nodes and marks must provide Markdown behavior on the Tiptap extension:

- `markdownTokenizer`
- `parseMarkdown`
- `renderMarkdown`

Pass the same extensions to import and export:

```ts
const json = importEditorContent(markdown, {
  from: 'markdown',
  extensions: [Callout, Mention],
}).value;

const markdownAgain = exportEditorContent(json, {
  to: 'markdown',
  extensions: [Callout, Mention],
}).value;
```

The regression test in `tests/format/custom-markdown-spike.test.ts` verifies that a custom block node, node attrs, nested content, a custom inline mark, and mark attrs survive:

```text
Markdown -> JSON -> Markdown -> JSON
```

Important mark-rendering detail: Tiptap uses an internal placeholder while rendering marked text. Custom mark renderers should use `helpers.renderChildren(node.content ?? [])` for the wrapped text and read mark attributes from `node.attrs`.

## HTML

HTML import/export uses `@tiptap/html`:

- HTML import sanitizes first, then parses into JSON.
- HTML export generates HTML from JSON, then sanitizes the output.
- Custom HTML nodes require matching Tiptap `parseHTML` and `renderHTML`.

## Iframe Embeds

Iframe is disabled by default. To import/export iframe nodes, enable both schema support and HTML policy:

```ts
const json = importEditorContent(html, {
  from: 'html',
  iframe: {
    allowedHosts: ['player.example'],
  },
  htmlPolicy: {
    iframe: {
      enabled: true,
      allowedHosts: ['player.example'],
    },
  },
}).value;
```

The allowlist defaults to empty. The package does not include built-in provider presets.

## Lossiness Rules

JSON can preserve every node, mark, and attr that the active schema allows.

Markdown may lose information when:

- a custom node or mark has no Markdown parser/renderer
- attributes have no Markdown syntax
- raw HTML is stripped
- a Markdown syntax cannot represent the original Tiptap structure

HTML may lose information when:

- DOMPurify removes unsafe tags or attributes
- the matching Tiptap extension is not provided
- iframe hosts are not allowlisted
