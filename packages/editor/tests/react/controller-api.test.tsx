import type { Editor as TiptapEditor } from '@tiptap/react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    Editor,
    ReadonlyRenderer,
    useEditorController,
    type EditorController,
} from '../../src/react';
import { createEmptyDocument } from '../../src/core';

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

async function waitForController(
    getController: () => EditorController | null,
): Promise<EditorController> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const controller = getController();
        if (controller?.editor) {
            return controller;
        }

        await act(async () => {
            await nextFrame();
        });
    }

    throw new Error('Editor controller was not ready.');
}

async function waitForDirty(getController: () => EditorController | null): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (getController()?.isDirty) {
            return;
        }

        await act(async () => {
            await nextFrame();
        });
    }

    throw new Error('Editor controller did not become dirty.');
}

describe('controller editor API', () => {
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

    it('renders the editor from a controller and reads JSON only on demand', async () => {
        let controller: EditorController | null = null;
        let tiptapEditor: TiptapEditor | null = null;

        function Harness() {
            controller = useEditorController({
                defaultContent: createEmptyDocument(),
                editorOptions: {
                    features: {
                        codeBlock: false,
                    },
                },
                onReady(editor) {
                    tiptapEditor = editor;
                },
            });

            return <Editor controller={controller} />;
        }

        await act(async () => {
            root.render(<Harness />);
            await nextFrame();
        });

        const readyController = await waitForController(() => controller);
        await act(async () => {
            await nextFrame();
        });

        await act(async () => {
            (tiptapEditor ?? readyController.editor)?.commands.insertContent('Hello');
            await nextFrame();
        });
        await waitForDirty(() => controller);

        expect(container.textContent).toContain('Hello');
        expect(container.querySelector('[aria-label="Code block"]')).toBeNull();
        expect(controller?.isDirty).toBe(true);
        expect(controller?.getJSON()).toMatchObject({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Hello' }],
                },
            ],
        });
    });

    it('does not re-render controller consumers when update meta is unchanged', async () => {
        let controller: EditorController | null = null;
        let tiptapEditor: TiptapEditor | null = null;
        let renderCount = 0;
        const onUpdate = vi.fn();

        function Harness() {
            renderCount += 1;
            controller = useEditorController({
                defaultContent: createEmptyDocument(),
                onUpdate,
                editorOptions: {
                    features: {
                        codeBlock: false,
                    },
                },
                onReady(editor) {
                    tiptapEditor = editor;
                },
            });

            return <Editor controller={controller} />;
        }

        await act(async () => {
            root.render(<Harness />);
            await nextFrame();
        });

        const readyController = await waitForController(() => controller);
        await act(async () => {
            await nextFrame();
        });

        await act(async () => {
            (tiptapEditor ?? readyController.editor)?.commands.insertContent('Hello');
            await nextFrame();
        });
        await waitForDirty(() => controller);

        const renderCountAfterDirty = renderCount;

        await act(async () => {
            (tiptapEditor ?? readyController.editor)?.commands.insertContent(' world');
            await nextFrame();
        });

        expect(onUpdate).toHaveBeenCalledTimes(2);
        expect(renderCount).toBe(renderCountAfterDirty);
    });

    it('uses controller locale and readonly options when rendering default UI', async () => {
        let controller: EditorController | null = null;

        function Harness({ readonly = false }: { readonly?: boolean }) {
            controller = useEditorController({
                defaultContent: createEmptyDocument(),
                locale: 'zh-CN',
                readonly,
                editorOptions: {
                    features: {
                        codeBlock: false,
                    },
                },
            });

            return <Editor controller={controller} />;
        }

        await act(async () => {
            root.render(<Harness />);
            await nextFrame();
        });
        await waitForController(() => controller);

        expect(container.querySelector('[data-tooltip="加粗"]')).not.toBeNull();
        expect(container.querySelector('[aria-label="代码块"]')).toBeNull();

        await act(async () => {
            root.render(<Harness readonly />);
            await nextFrame();
        });
        await waitForController(() => controller);

        expect(container.querySelector('[data-nameless-editor-toolbar="true"]')).toBeNull();
        expect(container.querySelector('[contenteditable]')?.getAttribute('contenteditable')).toBe(
            'false',
        );
    });

    it('re-exports ReadonlyRenderer from the react entry', () => {
        act(() => {
            root.render(
                <ReadonlyRenderer
                    content={{
                        type: 'doc',
                        content: [
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: 'React entry readonly' }],
                            },
                        ],
                    }}
                />,
            );
        });

        expect(container.textContent).toContain('React entry readonly');
        expect(container.querySelector('[data-nameless-editor-readonly="true"]')).not.toBeNull();
    });
});
