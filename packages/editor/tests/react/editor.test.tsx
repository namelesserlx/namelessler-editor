import type { Editor as TiptapEditor } from '@tiptap/react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../../src/react';
import { createEmptyDocument } from '../../src/core';

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

async function waitForEditor(getEditor: () => TiptapEditor | null): Promise<TiptapEditor> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const editor = getEditor();
        if (editor) {
            return editor;
        }

        await act(async () => {
            await nextFrame();
        });
    }

    throw new Error('Editor was not ready.');
}

describe('Editor', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it('imports markdown into readonly editor content', async () => {
        await act(async () => {
            root.render(<Editor defaultContent="# Hello" contentFormat="markdown" readonly />);
            await nextFrame();
        });

        expect(container.textContent).toContain('Hello');
        expect(container.querySelector('[contenteditable]')?.getAttribute('contenteditable')).toBe(
            'false',
        );
    });

    it('uses a lightweight onUpdate meta callback instead of returning full JSON', async () => {
        let editor: TiptapEditor | null = null;
        const onUpdate = vi.fn();

        await act(async () => {
            root.render(
                <Editor
                    defaultContent={createEmptyDocument()}
                    onUpdate={onUpdate}
                    onReady={(currentEditor) => {
                        editor = currentEditor;
                    }}
                    editorOptions={{
                        features: {
                            codeBlock: false,
                        },
                    }}
                />,
            );
            await nextFrame();
        });

        const readyEditor = await waitForEditor(() => editor);

        await act(async () => {
            readyEditor.commands.insertContent('Hello');
            await nextFrame();
        });

        expect(onUpdate).toHaveBeenCalledWith({
            isDirty: true,
            isEmpty: false,
        });
        expect(onUpdate.mock.calls[0][0]).not.toHaveProperty('content');
    });

    it('sanitizes html input and ignores legacy content/output props', async () => {
        await act(async () => {
            root.render(
                <Editor
                    {...({
                        content: '<p>legacy</p>',
                        output: 'html',
                    } as object)}
                    defaultContent="<p>safe</p><script>alert(1)</script>"
                    contentFormat="html"
                    readonly
                />,
            );
            await nextFrame();
        });

        expect(container.textContent).toContain('safe');
        expect(container.textContent).not.toContain('legacy');
        expect(container.innerHTML).not.toContain('script');
    });

    it('renders the default UI chrome and allows callers to disable it', async () => {
        await act(async () => {
            root.render(
                <Editor
                    defaultContent={createEmptyDocument()}
                    locale="en-US"
                    editorOptions={{
                        features: {
                            codeBlock: false,
                        },
                    }}
                />,
            );
            await nextFrame();
        });

        expect(container.querySelector('[data-nameless-editor-toolbar="true"]')).not.toBeNull();
        expect(container.querySelector('[aria-label="Bold"]')).not.toBeNull();
        expect(container.querySelector('[aria-label="Link"]')).not.toBeNull();
        expect(container.querySelector('[aria-label="Text color"]')).not.toBeNull();

        await act(async () => {
            root.render(
                <Editor
                    defaultContent={createEmptyDocument()}
                    ui={false}
                    editorOptions={{
                        features: {
                            codeBlock: false,
                        },
                    }}
                />,
            );
            await nextFrame();
        });

        expect(container.querySelector('[data-nameless-editor-toolbar="true"]')).toBeNull();
    });

    it('does not render a built-in slash command menu when slash content is typed', async () => {
        let editor: TiptapEditor | null = null;

        await act(async () => {
            root.render(
                <Editor
                    defaultContent={createEmptyDocument()}
                    onReady={(currentEditor) => {
                        editor = currentEditor;
                    }}
                    editorOptions={{
                        features: {
                            codeBlock: false,
                        },
                    }}
                />,
            );
            await nextFrame();
        });

        const readyEditor = await waitForEditor(() => editor);

        await act(async () => {
            readyEditor.commands.insertContent('/');
            await nextFrame();
        });

        const slashMenu = container.querySelector('[data-nameless-editor-slash-menu="true"]');
        expect(slashMenu).toBeNull();
    });
});
