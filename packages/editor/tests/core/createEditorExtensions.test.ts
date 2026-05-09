import { flattenExtensions } from '@tiptap/core';
import javascript from 'highlight.js/lib/languages/javascript';
import { describe, expect, it } from 'vitest';
import { createEditorExtensions } from '../../src/core/createEditorExtensions';
import { createLowlightRegistry } from '../../src/core/highlight';

function extensionNames(options?: Parameters<typeof createEditorExtensions>[0]): string[] {
    return flattenExtensions(createEditorExtensions(options)).map((extension) => extension.name);
}

describe('createLowlightRegistry', () => {
    it('starts with no registered languages', () => {
        const lowlight = createLowlightRegistry();

        expect(lowlight.listLanguages()).toEqual([]);
        expect(lowlight.registered('javascript')).toBe(false);
    });

    it('registers only explicitly provided languages and aliases', () => {
        const lowlight = createLowlightRegistry([
            {
                name: 'javascript',
                label: 'JavaScript',
                aliases: ['js'],
                grammar: javascript,
            },
        ]);

        expect(lowlight.registered('javascript')).toBe(true);
        expect(lowlight.registered('js')).toBe(true);
        expect(lowlight.registered('typescript')).toBe(false);
        expect(lowlight.listLanguages()).toEqual(['javascript']);
    });
});

describe('createEditorExtensions', () => {
    it('does not include business supplied extensions by default', () => {
        expect(extensionNames()).not.toContain('fileUpload');
        expect(extensionNames()).not.toContain('iframe');
        expect(extensionNames()).not.toContain('codeBlockPro');
    });

    it('includes GFM-oriented table and task list support by default', () => {
        expect(extensionNames()).toEqual(
            expect.arrayContaining([
                'table',
                'tableRow',
                'tableHeader',
                'tableCell',
                'taskList',
                'taskItem',
            ]),
        );
    });

    it('applies feature flags predictably', () => {
        const names = extensionNames({
            features: {
                links: false,
                codeBlock: false,
                tables: false,
                taskList: false,
            },
        });

        expect(names).not.toContain('link');
        expect(names).not.toContain('codeBlock');
        expect(names).not.toContain('table');
        expect(names).not.toContain('taskList');
    });

    it('passes only registered highlight languages to the code block extension', () => {
        const codeBlock = flattenExtensions(
            createEditorExtensions({
                highlightLanguages: [
                    {
                        name: 'javascript',
                        label: 'JavaScript',
                        aliases: ['js'],
                        grammar: javascript,
                    },
                ],
            }),
        ).find((extension) => extension.name === 'codeBlock');

        expect(codeBlock?.options.lowlight.registered('javascript')).toBe(true);
        expect(codeBlock?.options.lowlight.registered('typescript')).toBe(false);
    });
});
