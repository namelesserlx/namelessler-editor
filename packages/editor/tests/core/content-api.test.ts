import { Node } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import {
    createEmptyDocument,
    exportEditorContent,
    importEditorContent,
    normalizeEditorContent,
} from '../../src/core';

const AssetCard = Node.create({
    name: 'assetCard',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            url: { default: null },
            title: { default: null },
        };
    },
    renderHTML({ HTMLAttributes }) {
        return ['a', { ...HTMLAttributes, 'data-asset-card': 'true' }, HTMLAttributes.title];
    },
});

describe('extensions-first content API', () => {
    it('normalizes custom nodes from the supplied extensions without prebuilt options', () => {
        const doc = {
            type: 'doc',
            content: [
                {
                    type: 'assetCard',
                    attrs: {
                        url: 'https://cdn.example/file.pdf',
                        title: 'Spec',
                    },
                },
            ],
        };

        expect(normalizeEditorContent(doc)).toEqual(createEmptyDocument());
        expect(normalizeEditorContent(doc, { extensions: [AssetCard] })).toEqual(doc);
    });

    it('drops extension-owned URL nodes when every URL attribute is unsafe', () => {
        expect(
            normalizeEditorContent(
                {
                    type: 'doc',
                    content: [
                        {
                            type: 'assetCard',
                            attrs: {
                                url: 'javascript:alert(1)',
                                title: 'Bad asset',
                            },
                        },
                    ],
                },
                { extensions: [AssetCard] },
            ),
        ).toEqual(createEmptyDocument());
    });

    it('imports and exports through from/to without inputFormat/outputFormat', () => {
        const imported = importEditorContent('<p><strong>Hello</strong></p>', {
            from: 'html',
        });

        expect(imported.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: 'Hello',
                            marks: [{ type: 'bold' }],
                        },
                    ],
                },
            ],
        });

        const exported = exportEditorContent(imported.value, {
            to: 'html',
        });

        expect(exported.value).toBe('<p><strong>Hello</strong></p>');
    });
});
