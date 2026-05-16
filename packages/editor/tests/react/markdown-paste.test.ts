import { Editor } from '@tiptap/core';
import type { Transaction } from '@tiptap/pm/state';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyDocument } from '../../src/core';
import { createEditorExtensions } from '../../src/core/createEditorExtensions';
import {
    createMarkdownPasteHandler,
    parseMarkdownClipboardText,
    shouldScrollAfterMarkdownPaste,
    shouldParseMarkdownClipboardText,
} from '../../src/react/markdownPaste';

function createTestEditor() {
    const editor = new Editor({
        element: document.createElement('div'),
        extensions: createEditorExtensions({
            features: {
                codeBlock: false,
                tables: false,
                taskList: false,
            },
        }),
        content: createEmptyDocument(),
    });

    return editor;
}

function createPasteEvent(data: Record<string, string>) {
    const event = new Event('paste', { cancelable: true }) as ClipboardEvent;

    Object.defineProperty(event, 'clipboardData', {
        value: {
            getData: (type: string) => data[type] ?? '',
        },
    });

    return event;
}

describe('markdown paste', () => {
    it('detects markdown-shaped clipboard text without treating plain text as markdown', () => {
        expect(shouldParseMarkdownClipboardText('# Heading')).toBe(true);
        expect(shouldParseMarkdownClipboardText('- Item')).toBe(true);
        expect(shouldParseMarkdownClipboardText('Use **bold** text')).toBe(true);
        expect(shouldParseMarkdownClipboardText('plain text only')).toBe(false);
    });

    it('converts pasted markdown text into editor content', () => {
        const editor = createTestEditor();
        const slice = parseMarkdownClipboardText('# Heading\n\n- First\n- Second', editor.view, {});

        expect(slice).not.toBeNull();

        editor.view.dispatch(editor.state.tr.replaceSelection(slice!));

        const [heading, list] = editor.getJSON().content ?? [];

        expect(heading).toMatchObject({
            type: 'heading',
            attrs: {
                level: 1,
            },
            content: [{ type: 'text', text: 'Heading' }],
        });
        expect(list).toMatchObject({
            type: 'bulletList',
            content: [
                {
                    type: 'listItem',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'First' }],
                        },
                    ],
                },
                {
                    type: 'listItem',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'Second' }],
                        },
                    ],
                },
            ],
        });

        editor.destroy();
    });

    it('handles markdown-shaped plain text before the default paste parser runs', () => {
        const editor = createTestEditor();
        const event = createPasteEvent({
            'text/plain': '# Pasted heading',
        });
        const handler = createMarkdownPasteHandler(
            () => ({}),
            () => true,
        );

        expect(handler(editor.view, event)).toBe(true);
        expect(event.defaultPrevented).toBe(true);
        expect(editor.getJSON().content?.[0]).toMatchObject({
            type: 'heading',
            attrs: {
                level: 1,
            },
            content: [{ type: 'text', text: 'Pasted heading' }],
        });

        editor.destroy();
    });

    it('leaves ordinary long plain text to the default paste pipeline', () => {
        const editor = createTestEditor();
        const text = Array.from(
            { length: 500 },
            (_, index) => `This is a regular paragraph line ${index} without markdown syntax.`,
        ).join('\n');
        const event = createPasteEvent({
            'text/plain': text,
        });
        const handler = createMarkdownPasteHandler(
            () => ({}),
            () => true,
        );

        expect(handler(editor.view, event)).toBe(false);
        expect(event.defaultPrevented).toBe(false);
        expect(editor.getText()).toBe('');

        editor.destroy();
    });

    it('does not force scrolling after long markdown paste', () => {
        const editor = createTestEditor();
        const markdown = Array.from({ length: 120 }, (_, index) => `- Item ${index}`).join('\n');
        const event = createPasteEvent({
            'text/markdown': markdown,
        });
        const handler = createMarkdownPasteHandler(
            () => ({}),
            () => true,
        );
        const dispatch = vi.spyOn(editor.view, 'dispatch');

        expect(shouldScrollAfterMarkdownPaste(markdown)).toBe(false);
        expect(handler(editor.view, event)).toBe(true);

        const transaction = dispatch.mock.calls[0]?.[0] as Transaction | undefined;
        expect(transaction?.scrolledIntoView).toBe(false);

        editor.destroy();
    });
});
