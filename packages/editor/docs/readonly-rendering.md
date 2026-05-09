# Readonly Rendering

Readonly rendering is exported from the React entry for the common path:

```tsx
import { ReadonlyRenderer } from '@namelesserlx/editor/react';
import '@namelesserlx/editor/style.css';

<ReadonlyRenderer content={articleJson} contentFormat="json" />;
```

It is also provided through a separate entry:

```tsx
import { ReadonlyRenderer } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';

<ReadonlyRenderer content={articleJson} contentFormat="json" />;
```

Use `/readonly` for public article pages and other display-only surfaces. It avoids importing editing UI, toolbar controls, and editing handlers.

## Supported Input

ReadonlyRenderer accepts the same input formats:

- `json`
- `html`
- `markdown`

JSON is preferred for stored content:

```tsx
<ReadonlyRenderer content={article.contentJson} contentFormat="json" />
```

HTML and Markdown are treated as external import formats and are converted through the same format adapters as the editor.

## Security

Readonly rendering sanitizes external HTML before rendering.

Iframe remains disabled unless both schema and HTML policy are explicitly configured:

```tsx
<ReadonlyRenderer
  content={html}
  contentFormat="html"
  editorOptions={{
    features: {
      iframe: true,
    },
    iframe: {
      allowedHosts: ['player.example'],
    },
  }}
  htmlPolicy={{
    iframe: {
      enabled: true,
      allowedHosts: ['player.example'],
    },
  }}
/>
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
