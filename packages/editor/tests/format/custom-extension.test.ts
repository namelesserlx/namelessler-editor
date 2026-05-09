import {
    Mark,
    Node,
    createAtomBlockMarkdownSpec,
    mergeAttributes,
    type Extensions,
    type JSONContent,
    type MarkdownParseHelpers,
    type MarkdownRendererHelpers,
    type MarkdownToken,
} from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { exportContent, importContent } from '../../src/format';

const EmbedCard = Node.create({
    name: 'embedCard',

    group: 'block',
    atom: true,

    addAttributes() {
        return {
            provider: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-provider'),
                renderHTML: (attributes) => ({ 'data-provider': attributes.provider }),
            },
            id: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-id'),
                renderHTML: (attributes) => ({ 'data-id': attributes.id }),
            },
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-title'),
                renderHTML: (attributes) => ({ 'data-title': attributes.title }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-editor-embed-card]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-editor-embed-card': '',
            }),
        ];
    },

    ...createAtomBlockMarkdownSpec({
        nodeName: 'embedCard',
        name: 'embed',
        allowedAttributes: ['provider', 'id', 'title'],
    }),
});

const Spoiler = Mark.create({
    name: 'spoiler',

    parseHTML() {
        return [{ tag: 'span[data-spoiler]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-spoiler': '' }), 0];
    },

    markdownTokenName: 'spoiler',

    markdownTokenizer: {
        name: 'spoiler',
        level: 'inline',
        start: (source) => source.indexOf('||'),
        tokenize(source, _tokens, lexer) {
            const match = source.match(/^\|\|([\s\S]+?)\|\|/u);
            if (!match) {
                return undefined;
            }

            return {
                type: 'spoiler',
                raw: match[0],
                text: match[1],
                tokens: lexer.inlineTokens(match[1]),
            };
        },
    },

    parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
        return helpers.applyMark('spoiler', helpers.parseInline(token.tokens ?? []));
    },

    renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers) {
        return `||${helpers.renderChildren(node.content ?? [])}||`;
    },
});

const customExtensions: Extensions = [EmbedCard, Spoiler];

describe('custom extension format fidelity', () => {
    it('preserves custom block nodes and attributes when importing markdown', () => {
        const result = importContent(':::embed {provider="youtube" id="demo-1" title="Demo"} :::', {
            inputFormat: 'markdown',
            extensions: customExtensions,
        });

        expect(result.warnings).toEqual([]);
        expect(result.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'embedCard',
                    attrs: {
                        provider: 'youtube',
                        id: 'demo-1',
                        title: 'Demo',
                    },
                },
            ],
        });
    });

    it('preserves custom inline marks when importing markdown', () => {
        const result = importContent('Visible ||hidden **bold**|| text', {
            inputFormat: 'markdown',
            extensions: customExtensions,
        });

        const paragraph = result.value.content?.[0];
        expect(paragraph?.type).toBe('paragraph');
        expect(JSON.stringify(paragraph)).toContain('"type":"spoiler"');
        expect(JSON.stringify(paragraph)).toContain('"type":"bold"');
    });

    it('serializes custom block nodes and marks back to markdown', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    {
                        type: 'embedCard',
                        attrs: {
                            provider: 'youtube',
                            id: 'demo-1',
                            title: 'Demo',
                        },
                    },
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Visible ' },
                            {
                                type: 'text',
                                text: 'hidden',
                                marks: [{ type: 'spoiler' }],
                            },
                        ],
                    },
                ],
            },
            {
                outputFormat: 'markdown',
                extensions: customExtensions,
            },
        );

        expect(result.warnings).toEqual([]);
        expect(result.value).toContain(':::embed {#demo-1');
        expect(result.value).toContain('provider="youtube"');
        expect(result.value).toContain('title="Demo"');
        expect(result.value).toContain('||hidden||');
    });

    it('preserves custom nodes through sanitized HTML conversion', () => {
        const result = importContent(
            '<div data-editor-embed-card data-provider="youtube" data-id="demo-1" data-title="Demo" onclick="alert(1)"></div>',
            {
                inputFormat: 'html',
                extensions: customExtensions,
            },
        );

        expect(result.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'embedCard',
                    attrs: {
                        provider: 'youtube',
                        id: 'demo-1',
                        title: 'Demo',
                    },
                },
            ],
        });

        const html = exportContent(result.value, {
            outputFormat: 'html',
            extensions: customExtensions,
        });

        expect(html.value).toContain('data-editor-embed-card');
        expect(html.value).toContain('data-provider="youtube"');
        expect(html.value).not.toContain('onclick');
    });
});
