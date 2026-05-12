import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadonlyHtml, ReadonlyRenderer, renderReadonlyHtml } from '../../src/readonly';

describe('ReadonlyRenderer', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it('renders JSON content without editing UI', () => {
        act(() => {
            root.render(
                <ReadonlyRenderer
                    content={{
                        type: 'doc',
                        content: [
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: 'Readonly JSON' }],
                            },
                        ],
                    }}
                    contentFormat="json"
                />,
            );
        });

        expect(container.textContent).toContain('Readonly JSON');
        expect(container.querySelector('[data-nameless-editor-readonly="true"]')).not.toBeNull();
        expect(container.querySelector('[role="toolbar"]')).toBeNull();
    });

    it('uses JSON as the default content format', () => {
        act(() => {
            root.render(
                <ReadonlyRenderer
                    content={{
                        type: 'doc',
                        content: [
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: 'Default JSON' }],
                            },
                        ],
                    }}
                />,
            );
        });

        expect(container.textContent).toContain('Default JSON');
    });

    it('sanitizes dangerous HTML and link protocols', () => {
        act(() => {
            root.render(
                <ReadonlyRenderer
                    content='<p>safe</p><a href="javascript:alert(1)">bad</a><img src=x onerror=alert(1)>'
                    contentFormat="html"
                />,
            );
        });

        expect(container.textContent).toContain('safe');
        expect(container.innerHTML).not.toContain('javascript:');
        expect(container.innerHTML).not.toContain('onerror');
    });

    it('renders markdown input and ignores legacy onChange props', () => {
        const onChange = vi.fn();

        act(() => {
            root.render(
                <ReadonlyRenderer
                    {...({ onChange } as object)}
                    content="**Readonly Markdown**"
                    contentFormat="markdown"
                />,
            );
        });

        expect(container.textContent).toContain('Readonly Markdown');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('renders safe HTML synchronously for SSR and cacheable display paths', () => {
        const result = renderReadonlyHtml(
            {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'SSR readonly',
                                marks: [{ type: 'bold' }],
                            },
                        ],
                    },
                ],
            },
            {
                contentFormat: 'json',
            },
        );

        expect(result.value).toBe('<p><strong>SSR readonly</strong></p>');
        expect(result.warnings).toEqual([]);
        expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes readonly content in server-rendered markup', () => {
        const html = renderToString(
            <ReadonlyRenderer
                content={{
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'Server visible' }],
                        },
                    ],
                }}
            />,
        );

        expect(html).toContain('Server visible');
        expect(html).toContain('data-nameless-editor-readonly="true"');
    });

    it('renders precomputed safe HTML without running content conversion', () => {
        act(() => {
            root.render(<ReadonlyHtml html="<p>Cached readonly HTML</p>" />);
        });

        expect(container.textContent).toContain('Cached readonly HTML');
        expect(container.querySelector('[data-nameless-editor-readonly="true"]')).not.toBeNull();
    });
});
