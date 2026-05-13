import { describe, expect, it } from 'vitest';
import { exportContent, importContent } from '../../src/format';

describe('html format spike', () => {
    it('imports sanitized HTML into TipTap JSON', () => {
        const result = importContent('<h1>Hello</h1><p onclick="alert(1)">World</p>', {
            inputFormat: 'html',
        });

        expect(result.stats.lossy).toBe(true);
        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'SANITIZED_HTML',
                }),
            ]),
        );
        expect(result.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: 'Hello' }],
                },
                { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
            ],
        });
    });

    it('exports JSON to sanitized HTML', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'site',
                                marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
                            },
                        ],
                    },
                ],
            },
            { outputFormat: 'html' },
        );

        expect(result.value).toContain('href="https://example.com"');
        expect(result.value).toContain('target="_blank"');
        expect(result.value).toContain('rel="noopener noreferrer nofollow"');
        expect(result.warnings).toEqual([]);
    });

    it('round-trips supported HTML through JSON', () => {
        const imported = importContent('<h2>Title</h2><p><strong>Body</strong></p>', {
            inputFormat: 'html',
        });
        const exported = exportContent(imported.value, { outputFormat: 'html' });

        expect(exported.value).toBe('<h2>Title</h2><p><strong>Body</strong></p>');
    });

    it('does not warn for empty default attributes emitted by HTML parsing', () => {
        const result = importContent('<h2>Title</h2><p>Body</p>', {
            inputFormat: 'html',
        });

        expect(result.warnings).toEqual([]);
        expect(result.stats.lossy).toBe(false);
        expect(result.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Title' }],
                },
                { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
            ],
        });
    });

    it('exports default editor marks and block attrs with the format schema', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        attrs: { textAlign: 'center' },
                        content: [
                            {
                                type: 'text',
                                text: 'Styled',
                                marks: [
                                    { type: 'textStyle', attrs: { color: '#2563eb' } },
                                    { type: 'highlight', attrs: { color: '#fef08a' } },
                                    { type: 'underline' },
                                ],
                            },
                        ],
                    },
                ],
            },
            { outputFormat: 'html' },
        );

        expect(result.warnings).toEqual([]);
        expect(result.value).toContain('text-align: center');
        expect(result.value).toContain('color: #2563eb');
        expect(result.value).toContain('background-color: #fef08a');
        expect(result.value).toContain('<u>');
    });

    it('uses editorOptions when importing iframe schema support', () => {
        const result = importContent(
            '<iframe src="https://player.example/embed/1" title="Demo"></iframe>',
            {
                inputFormat: 'html',
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
            },
        );

        expect(result.value).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'iframe',
                    attrs: {
                        src: 'https://player.example/embed/1',
                        title: 'Demo',
                        allowfullscreen: false,
                        loading: 'lazy',
                    },
                },
            ],
        });
    });

    it('uses placeholders for unsupported nodes when exporting HTML by default', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
                    { type: 'customWidget', attrs: { id: 'a' } },
                    { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
                ],
            },
            { outputFormat: 'html' },
        );

        expect(result.value).toContain('<p>Before</p>');
        expect(result.value).toContain('<p>[Unsupported node: customWidget]</p>');
        expect(result.value).toContain('<p>After</p>');
        expect(result.stats.lossy).toBe(true);
        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'UNSUPPORTED_NODE',
                    path: ['content', 1],
                }),
            ]),
        );
    });

    it('can drop unsupported HTML nodes while preserving supported content', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
                    { type: 'customWidget', attrs: { id: 'a' } },
                    { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
                ],
            },
            { outputFormat: 'html', unsupported: 'drop' },
        );

        expect(result.value).toContain('<p>Before</p>');
        expect(result.value).not.toContain('customWidget');
        expect(result.value).toContain('<p>After</p>');
        expect(result.stats.lossy).toBe(true);
    });

    it('keeps a strict HTML export mode for callers that want fail-fast behavior', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
                    { type: 'customWidget', attrs: { id: 'a' } },
                ],
            },
            { outputFormat: 'html', unsupported: 'fail' },
        );

        expect(result.value).toBe('');
        expect(result.stats.lossy).toBe(true);
        expect(result.warnings).toEqual([
            {
                code: 'UNSUPPORTED_NODE',
                message: 'Node "customWidget" cannot be exported to HTML.',
                path: ['content', 1],
            },
        ]);
    });
});
