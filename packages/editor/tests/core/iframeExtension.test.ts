import { flattenExtensions } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { createEditorExtensions } from '../../src/core/createEditorExtensions';
import { exportContent, importContent } from '../../src/format';

function extensionNames(options?: Parameters<typeof createEditorExtensions>[0]): string[] {
    return flattenExtensions(createEditorExtensions(options)).map((extension) => extension.name);
}

describe('iframe embed extension', () => {
    it('is disabled by default and only registered when explicitly enabled', () => {
        expect(extensionNames()).not.toContain('iframe');
        expect(
            extensionNames({
                features: {
                    iframe: true,
                },
                iframe: {
                    allowedHosts: ['player.example'],
                },
            }),
        ).toContain('iframe');
    });

    it('imports and exports iframe embeds only through the allowlist policy', () => {
        const allowed = importContent(
            '<iframe src="https://player.example/embed/1" title="Demo" allowfullscreen onclick="alert(1)"></iframe>',
            {
                inputFormat: 'html',
                iframe: {
                    allowedHosts: ['player.example'],
                },
                htmlPolicy: {
                    iframe: {
                        enabled: true,
                        allowedHosts: ['player.example'],
                    },
                },
            },
        );

        expect(allowed.value).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'iframe',
                    attrs: {
                        src: 'https://player.example/embed/1',
                        title: 'Demo',
                        allowfullscreen: true,
                    },
                },
            ],
        });

        const html = exportContent(allowed.value, {
            outputFormat: 'html',
            iframe: {
                allowedHosts: ['player.example'],
            },
            htmlPolicy: {
                iframe: {
                    enabled: true,
                    allowedHosts: ['player.example'],
                },
            },
        });

        expect(html.value).toContain('src="https://player.example/embed/1"');
        expect(html.value).toContain('allowfullscreen');
        expect(html.value).not.toContain('onclick');

        const blocked = importContent('<iframe src="https://evil.example/embed/1"></iframe>', {
            inputFormat: 'html',
            iframe: {
                allowedHosts: ['player.example'],
            },
            htmlPolicy: {
                iframe: {
                    enabled: true,
                    allowedHosts: ['player.example'],
                },
            },
        });

        expect(blocked.value).toEqual({
            type: 'doc',
            content: [{ type: 'paragraph' }],
        });
    });
});
