# Readonly Rendering

Readonly rendering is a safe HTML display pipeline, not a readonly Tiptap runtime. The core API is synchronous so it works for SSR, SEO, static generation, and cached article HTML:

```tsx
import { ReadonlyHtml, renderReadonlyHtml } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';

const html = renderReadonlyHtml(articleJson, {
  contentFormat: 'json',
}).value;

<ReadonlyHtml html={html} />;
```

For client-only previews, use `ReadonlyRenderer`. It calls the same `renderReadonlyHtml` function during render:

```tsx
import { ReadonlyRenderer } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';

<ReadonlyRenderer content={articleJson} contentFormat="json" />;
```

The React entry also re-exports these APIs for convenience:

```tsx
import { ReadonlyRenderer, renderReadonlyHtml } from '@namelesserlx/editor/react';
```

Use `/readonly` for public article pages and other display-only surfaces. It avoids importing editing UI, toolbar controls, and editing handlers.

## Supported Input

`renderReadonlyHtml` and `ReadonlyRenderer` accept the same input formats:

- `json`
- `html`
- `markdown`

JSON is preferred for stored content:

```ts
const html = renderReadonlyHtml(article.contentJson, {
  contentFormat: 'json',
}).value;
```

HTML and Markdown are treated as external import formats and are converted through the same format adapters as the editor.

For the fastest public page path, generate and persist display HTML when the article is saved:

```ts
const contentJson = controller.getJSON();
const contentHtml = renderReadonlyHtml(contentJson, {
  contentFormat: 'json',
}).value;

await saveArticle({ contentJson, contentHtml });
```

## Security

Readonly rendering sanitizes external HTML before rendering.

Iframe remains disabled unless both schema and HTML policy are explicitly configured:

```tsx
const html = renderReadonlyHtml(content, {
  contentFormat: 'html',
  editorOptions: {
    features: {
      iframe: true,
    },
    iframe: {
      allowedHosts: ['player.example'],
    },
  },
  htmlPolicy: {
    iframe: {
      enabled: true,
      allowedHosts: ['player.example'],
    },
  },
}).value;
```

## Bundle Boundary

The package size script checks that `/readonly` does not import editing-only dependencies such as:

- `@tiptap/react`
- `lucide-react`
- default toolbar code

Run:

```bash
pnpm --filter @namelesserlx/editor size
```

## Styling

The renderer emits semantic HTML through Tiptap HTML generation. Applications may use their own article typography styles, or import the package default CSS:

```ts
import '@namelesserlx/editor/style.css';
```

For public article pages with an existing prose system, prefer application-level article styles and keep editor defaults minimal.
