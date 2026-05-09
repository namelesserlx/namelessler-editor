import { describe, expect, it } from 'vitest';
import { exportContent, importContent } from '../../src/format';

describe('markdown format spike', () => {
    it('imports GFM tables and task lists into TipTap JSON', () => {
        const result = importContent(
            [
                '# Roadmap',
                '',
                '- [x] spike',
                '- [ ] implementation',
                '',
                '| name | value |',
                '| ---- | ----- |',
                '| api  | json  |',
            ].join('\n'),
            { inputFormat: 'markdown' },
        );

        expect(result.warnings).toEqual([]);
        expect(result.value.type).toBe('doc');
        expect(result.value.content?.map((node) => node.type)).toEqual([
            'heading',
            'taskList',
            'table',
        ]);
        expect(result.value.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    });

    it('preserves fenced code block language', () => {
        const result = importContent('```ts\nconst answer = 42\n```', {
            inputFormat: 'markdown',
        });

        expect(result.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'codeBlock',
                    attrs: { language: 'ts' },
                    content: [{ type: 'text', text: 'const answer = 42' }],
                },
            ],
        });
    });

    it('removes raw HTML from markdown by default', () => {
        const result = importContent('<img src=x onerror=alert(1)><script>alert(1)</script>', {
            inputFormat: 'markdown',
        });

        expect(JSON.stringify(result.value)).not.toContain('script');
        expect(JSON.stringify(result.value)).not.toContain('onerror');
    });

    it('preserves HTML text inside fenced code blocks while removing raw HTML outside', () => {
        const result = importContent(
            [
                '<div onclick="alert(1)">raw</div>',
                '',
                '```html',
                '<div class="example">Hello</div>',
                '```',
            ].join('\n'),
            { inputFormat: 'markdown' },
        );

        expect(JSON.stringify(result.value)).not.toContain('onclick');
        expect(result.value.content?.find((node) => node.type === 'codeBlock')).toMatchObject({
            type: 'codeBlock',
            attrs: { language: 'html' },
            content: [{ type: 'text', text: '<div class="example">Hello</div>' }],
        });
    });

    it('exports supported JSON to stable markdown', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [
                    {
                        type: 'heading',
                        attrs: { level: 1 },
                        content: [{ type: 'text', text: 'Roadmap' }],
                    },
                    {
                        type: 'codeBlock',
                        attrs: { language: 'ts' },
                        content: [{ type: 'text', text: 'const answer = 42' }],
                    },
                ],
            },
            { outputFormat: 'markdown' },
        );

        expect(result.value).toContain('# Roadmap');
        expect(result.value).toContain('```ts');
        expect(result.value).toContain('const answer = 42');
        expect(result.warnings).toEqual([]);
    });

    it('emits an error warning for unknown nodes when exporting markdown', () => {
        const result = exportContent(
            {
                type: 'doc',
                content: [{ type: 'customWidget', attrs: { id: 'a' } }],
            },
            { outputFormat: 'markdown' },
        );

        expect(result.warnings).toEqual([
            {
                code: 'UNSUPPORTED_NODE',
                message: 'Node "customWidget" cannot be exported to markdown.',
                path: ['content', 0],
            },
        ]);
    });
});
