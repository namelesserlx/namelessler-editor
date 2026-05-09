import {
    Mark,
    Node,
    createBlockMarkdownSpec,
    mergeAttributes,
    type Extensions,
    type JSONContent,
    type MarkdownParseHelpers,
    type MarkdownRendererHelpers,
    type MarkdownToken,
} from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { exportContent, importContent } from '../../src/format';

const Callout = Node.create({
    name: 'callout',

    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            kind: {
                default: 'info',
                parseHTML: (element) => element.getAttribute('data-kind') ?? 'info',
                renderHTML: (attributes) => ({ 'data-kind': attributes.kind }),
            },
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-title'),
                renderHTML: (attributes) =>
                    attributes.title ? { 'data-title': attributes.title } : {},
            },
        };
    },

    parseHTML() {
        return [{ tag: 'aside[data-editor-callout]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['aside', mergeAttributes(HTMLAttributes, { 'data-editor-callout': '' }), 0];
    },

    ...createBlockMarkdownSpec({
        nodeName: 'callout',
        name: 'callout',
        defaultAttributes: { kind: 'info' },
        allowedAttributes: ['kind', 'title'],
        content: 'block',
    }),
});

const Mention = Mark.create({
    name: 'mention',

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-id'),
                renderHTML: (attributes) => ({ 'data-id': attributes.id }),
            },
            label: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-label'),
                renderHTML: (attributes) => ({ 'data-label': attributes.label }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-editor-mention]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-editor-mention': '' }), 0];
    },

    markdownTokenName: 'mention',

    markdownTokenizer: {
        name: 'mention',
        level: 'inline',
        start: (source) => source.indexOf('@['),
        tokenize(source) {
            const match = source.match(/^@\[([^\]]+)\]\(([^)]+)\)/u);
            if (!match) {
                return undefined;
            }

            return {
                type: 'mention',
                raw: match[0],
                text: match[1],
                attrs: {
                    id: match[2],
                    label: match[1],
                },
            };
        },
    },

    parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
        return helpers.applyMark(
            'mention',
            [{ type: 'text', text: token.text ?? '' }],
            token.attrs as Record<string, unknown>,
        );
    },

    renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers) {
        const text = helpers.renderChildren(node.content ?? []);
        const id = typeof node.attrs?.id === 'string' ? node.attrs.id : text;

        return `@[${text}](${id})`;
    },
});

const customExtensions: Extensions = [Callout, Mention];

describe('custom markdown syntax spike', () => {
    it('round-trips custom block nodes, attrs, nested content, and inline mark attrs', () => {
        const markdown = [
            ':::callout {kind="warning" title="Careful"}',
            '',
            'Hello **bold** @[Codex](user-1)',
            '',
            ':::',
        ].join('\n');

        const imported = importContent(markdown, {
            inputFormat: 'markdown',
            extensions: customExtensions,
        });

        expect(imported.stats.lossy).toBe(false);
        expect(imported.warnings).toEqual([]);
        expect(imported.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'callout',
                    attrs: {
                        kind: 'warning',
                        title: 'Careful',
                    },
                    content: [
                        {
                            type: 'paragraph',
                            content: expect.arrayContaining([
                                {
                                    type: 'text',
                                    text: 'Codex',
                                    marks: [
                                        {
                                            type: 'mention',
                                            attrs: {
                                                id: 'user-1',
                                                label: 'Codex',
                                            },
                                        },
                                    ],
                                },
                            ]),
                        },
                    ],
                },
            ],
        });

        const exported = exportContent(imported.value, {
            outputFormat: 'markdown',
            extensions: customExtensions,
        });
        const reparsed = importContent(exported.value, {
            inputFormat: 'markdown',
            extensions: customExtensions,
        });

        expect(exported.stats.lossy).toBe(false);
        expect(exported.warnings).toEqual([]);
        expect(reparsed.value).toEqual(imported.value);
    });
});
