import { Node } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { exportContent, importContent } from '../../src/format';
import {
    createEmptyDocument,
    createNormalizeOptions,
    isEditorJson,
    normalizeEditorJson,
    normalizeEditorJsonWithReport,
} from '../../src/core/documentModel';

const UploadFileCard = Node.create({
    name: 'uploadFileCard',
    group: 'block',
    atom: true,
});

describe('documentModel', () => {
    it('recognizes a valid TipTap JSON document', () => {
        expect(
            isEditorJson({
                type: 'doc',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
            }),
        ).toBe(true);
    });

    it('rejects non-doc roots and non-object values', () => {
        expect(isEditorJson(null)).toBe(false);
        expect(isEditorJson('hello')).toBe(false);
        expect(isEditorJson({ type: 'paragraph' })).toBe(false);
        expect(isEditorJson({ type: 'doc', content: 'not-array' })).toBe(false);
    });

    it('creates the canonical empty document', () => {
        expect(createEmptyDocument()).toEqual({
            type: 'doc',
            content: [{ type: 'paragraph' }],
        });
    });

    it('normalizes invalid input to the canonical empty document', () => {
        expect(normalizeEditorJson(undefined)).toEqual(createEmptyDocument());
        expect(normalizeEditorJson({ type: 'paragraph' })).toEqual(createEmptyDocument());
    });

    it('drops unknown nodes and unsafe mark attributes while preserving supported content', () => {
        expect(
            normalizeEditorJson({
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        attrs: { textAlign: 'center', onclick: 'alert(1)' },
                        content: [
                            {
                                type: 'text',
                                text: 'safe',
                                marks: [
                                    { type: 'bold' },
                                    { type: 'link', attrs: { href: 'https://example.com' } },
                                    { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                                ],
                            },
                            { type: 'unknownNode', attrs: { value: true } },
                        ],
                    },
                ],
            }),
        ).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    attrs: { textAlign: 'center' },
                    content: [
                        {
                            type: 'text',
                            text: 'safe',
                            marks: [
                                { type: 'bold' },
                                { type: 'link', attrs: { href: 'https://example.com' } },
                            ],
                        },
                    ],
                },
            ],
        });
    });

    it('uses the shared URL policy for JSON links and images', () => {
        expect(
            normalizeEditorJson({
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'protocol relative',
                                marks: [{ type: 'link', attrs: { href: '//evil.example/path' } }],
                            },
                            {
                                type: 'text',
                                text: 'bare domain',
                                marks: [{ type: 'link', attrs: { href: 'example.com/docs' } }],
                            },
                        ],
                    },
                    {
                        type: 'image',
                        attrs: { src: '//evil.example/image.png', alt: 'unsafe' },
                    },
                ],
            }),
        ).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        { type: 'text', text: 'protocol relative' },
                        {
                            type: 'text',
                            text: 'bare domain',
                            marks: [{ type: 'link', attrs: { href: 'https://example.com/docs' } }],
                        },
                    ],
                },
            ],
        });
    });

    it('drops iframe JSON unless iframe is explicitly enabled and allowlisted', () => {
        const doc = {
            type: 'doc',
            content: [
                {
                    type: 'iframe',
                    attrs: { src: 'https://video.example/embed', title: 'Video' },
                },
                {
                    type: 'iframe',
                    attrs: { src: 'https://evil.example/embed', title: 'Bad' },
                },
            ],
        };

        expect(normalizeEditorJson(doc)).toEqual(createEmptyDocument());
        expect(
            normalizeEditorJson(doc, {
                iframe: {
                    enabled: true,
                    allowedHosts: ['video.example'],
                },
            }),
        ).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'iframe',
                    attrs: { src: 'https://video.example/embed', title: 'Video' },
                },
            ],
        });
    });

    it('normalizes JSON against the active editor feature schema', () => {
        const result = importContent(
            {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'link should become plain text',
                                marks: [
                                    {
                                        type: 'link',
                                        attrs: { href: 'https://example.com' },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'codeBlock',
                        content: [{ type: 'text', text: 'const value = 1' }],
                    },
                ],
            },
            {
                inputFormat: 'json',
                editorOptions: {
                    features: {
                        links: false,
                        codeBlock: false,
                    },
                },
            },
        );

        expect(result.value).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'link should become plain text' }],
                },
            ],
        });
        expect(result.stats.lossy).toBe(true);
        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'UNSUPPORTED_MARK',
                    path: ['content', 0, 'content', 0, 'marks', 0],
                }),
                expect.objectContaining({
                    code: 'UNSUPPORTED_NODE',
                    path: ['content', 1],
                }),
            ]),
        );
    });

    it('applies custom attribute sanitizers to extension-owned nodes', () => {
        const options = createNormalizeOptions([UploadFileCard], {
            attributeSanitizers: {
                nodes: {
                    uploadFileCard: (attrs, { sanitizeUrl }) => {
                        const url =
                            typeof attrs.url === 'string'
                                ? sanitizeUrl(attrs.url, {
                                      allowedProtocols: ['http:', 'https:'],
                                      allowRelativeUrls: true,
                                  })
                                : null;
                        if (!url) {
                            return null;
                        }

                        return {
                            url,
                            name: typeof attrs.name === 'string' ? attrs.name : undefined,
                        };
                    },
                },
            },
        });

        expect(
            normalizeEditorJson(
                {
                    type: 'doc',
                    content: [
                        {
                            type: 'uploadFileCard',
                            attrs: { url: 'javascript:alert(1)', name: 'bad.pdf' },
                        },
                        {
                            type: 'uploadFileCard',
                            attrs: { url: 'https://cdn.example/good.pdf', name: 'good.pdf' },
                        },
                    ],
                },
                options,
            ),
        ).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'uploadFileCard',
                    attrs: { url: 'https://cdn.example/good.pdf', name: 'good.pdf' },
                },
            ],
        });
    });

    it('sanitizes URL-shaped custom attributes without a custom sanitizer', () => {
        const options = createNormalizeOptions([UploadFileCard]);

        expect(
            normalizeEditorJson(
                {
                    type: 'doc',
                    content: [
                        {
                            type: 'uploadFileCard',
                            attrs: {
                                url: 'javascript:alert(1)',
                                src: '//evil.example/file.pdf',
                                href: 'mailto:hello@example.com',
                                name: 'file.pdf',
                            },
                        },
                    ],
                },
                options,
            ),
        ).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'uploadFileCard',
                    attrs: {
                        href: 'mailto:hello@example.com',
                        name: 'file.pdf',
                    },
                },
            ],
        });
    });

    it('reports dropped and sanitized attributes while normalizing JSON in one pass', () => {
        const result = normalizeEditorJsonWithReport({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    attrs: {
                        textAlign: 'center',
                        onclick: 'alert(1)',
                    },
                    content: [
                        {
                            type: 'text',
                            text: 'safe',
                            marks: [
                                { type: 'bold' },
                                { type: 'link', attrs: { href: 'example.com/docs' } },
                            ],
                        },
                    ],
                },
            ],
        });

        expect(result.value).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    attrs: { textAlign: 'center' },
                    content: [
                        {
                            type: 'text',
                            text: 'safe',
                            marks: [
                                { type: 'bold' },
                                {
                                    type: 'link',
                                    attrs: { href: 'https://example.com/docs' },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        expect(result.lossy).toBe(true);
        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'DROPPED_ATTRIBUTE',
                    path: ['content', 0, 'attrs', 'onclick'],
                }),
                expect.objectContaining({
                    code: 'SANITIZED_ATTRIBUTE',
                    path: ['content', 0, 'content', 0, 'marks', 1, 'attrs', 'href'],
                }),
            ]),
        );
    });

    it('applies custom attribute sanitizers to built-in nodes and marks', () => {
        const result = importContent(
            {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        attrs: {
                            textAlign: 'right',
                            trackingId: 'intro',
                            onclick: 'alert(1)',
                        },
                        content: [
                            {
                                type: 'text',
                                text: 'tracked',
                                marks: [
                                    {
                                        type: 'link',
                                        attrs: {
                                            href: 'https://example.com',
                                            title: 'Example',
                                            trackingId: 'cta',
                                            onclick: 'alert(1)',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                inputFormat: 'json',
                attributeSanitizers: {
                    nodes: {
                        paragraph: (attrs) => ({
                            trackingId:
                                typeof attrs.trackingId === 'string' ? attrs.trackingId : undefined,
                        }),
                    },
                    marks: {
                        link: (attrs) => ({
                            trackingId:
                                typeof attrs.trackingId === 'string' ? attrs.trackingId : undefined,
                        }),
                    },
                },
            },
        );

        expect(result.value).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    attrs: { textAlign: 'right', trackingId: 'intro' },
                    content: [
                        {
                            type: 'text',
                            text: 'tracked',
                            marks: [
                                {
                                    type: 'link',
                                    attrs: {
                                        href: 'https://example.com',
                                        title: 'Example',
                                        trackingId: 'cta',
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        expect(result.stats.lossy).toBe(true);
        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'DROPPED_ATTRIBUTE',
                    path: ['content', 0, 'attrs', 'onclick'],
                }),
                expect.objectContaining({
                    code: 'DROPPED_ATTRIBUTE',
                    path: ['content', 0, 'content', 0, 'marks', 0, 'attrs', 'onclick'],
                }),
            ]),
        );
    });

    it('drops unsupported nodes by default when exporting JSON', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
                    { type: 'customWidget', attrs: { id: 'a' } },
                    { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
                ],
            },
            { outputFormat: 'json' },
        );

        expect(result.value).toEqual({
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
            ],
        });
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

    it('can use placeholders for unsupported nodes when exporting JSON', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
                    { type: 'customWidget', attrs: { id: 'a' } },
                ],
            },
            { outputFormat: 'json', unsupported: 'placeholder' },
        );

        expect(result.value).toEqual({
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '[Unsupported node: customWidget]' }],
                },
            ],
        });
        expect(result.stats.lossy).toBe(true);
    });
});
