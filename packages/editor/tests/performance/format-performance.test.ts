import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { exportContent, importContent } from '../../src/format';

function createLargeDocument(blocks = 360): JSONContent {
    return {
        type: 'doc',
        content: Array.from({ length: blocks }, (_, index): JSONContent => {
            if (index % 12 === 0) {
                return {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: `Section ${index / 12 + 1}` }],
                };
            }

            if (index % 9 === 0) {
                return {
                    type: 'codeBlock',
                    attrs: { language: 'ts' },
                    content: [
                        {
                            type: 'text',
                            text: `const value${index} = ${index};`,
                        },
                    ],
                };
            }

            return {
                type: 'paragraph',
                content: [
                    { type: 'text', text: `Paragraph ${index} keeps input latency predictable ` },
                    { type: 'text', text: 'with bold text', marks: [{ type: 'bold' }] },
                    { type: 'text', text: ' and a safe link.' },
                ],
            };
        }),
    };
}

describe('format performance smoke tests', () => {
    it('exports and imports a large document within the v1 latency budget', () => {
        const document = createLargeDocument();
        const markdown = exportContent(document, { outputFormat: 'markdown' });
        const html = exportContent(document, { outputFormat: 'html' });
        const reparsedMarkdown = importContent(markdown.value, { inputFormat: 'markdown' });
        const reparsedHtml = importContent(html.value, { inputFormat: 'html' });

        expect(markdown.warnings).toEqual([]);
        expect(html.warnings).toEqual([]);
        expect(reparsedMarkdown.value.content?.length).toBe(document.content?.length);
        expect(reparsedHtml.value.content?.length).toBe(document.content?.length);
        expect(markdown.stats.durationMs).toBeLessThan(1_200);
        expect(html.stats.durationMs).toBeLessThan(1_200);
        expect(reparsedMarkdown.stats.durationMs).toBeLessThan(1_500);
        expect(reparsedHtml.stats.durationMs).toBeLessThan(1_500);
    });
});
