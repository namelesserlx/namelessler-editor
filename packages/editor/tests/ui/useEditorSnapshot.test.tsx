import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useEditorSnapshot } from '../../src/ui/hooks/useEditorSnapshot';
import type { Editor as TiptapEditor } from '@tiptap/react';

type Listener = () => void;

class FakeEditor {
    private listeners = new Map<string, Set<Listener>>();

    on(event: string, listener: Listener) {
        const listeners = this.listeners.get(event) ?? new Set<Listener>();
        listeners.add(listener);
        this.listeners.set(event, listeners);
    }

    off(event: string, listener: Listener) {
        this.listeners.get(event)?.delete(listener);
    }

    emit(event: string) {
        this.listeners.get(event)?.forEach((listener) => listener());
    }
}

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

describe('useEditorSnapshot', () => {
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

    it('does not re-render for internal transaction events', async () => {
        const fakeEditor = new FakeEditor();
        let renderCount = 0;

        function Probe() {
            useEditorSnapshot(fakeEditor as unknown as TiptapEditor);
            renderCount += 1;
            return null;
        }

        await act(async () => {
            root.render(<Probe />);
            await nextFrame();
        });

        const initialRenderCount = renderCount;

        await act(async () => {
            fakeEditor.emit('transaction');
            await nextFrame();
        });

        expect(renderCount).toBe(initialRenderCount);
    });

    it('coalesces selection and content updates into one render per frame', async () => {
        const fakeEditor = new FakeEditor();
        let renderCount = 0;

        function Probe() {
            useEditorSnapshot(fakeEditor as unknown as TiptapEditor);
            renderCount += 1;
            return null;
        }

        await act(async () => {
            root.render(<Probe />);
            await nextFrame();
        });

        const initialRenderCount = renderCount;

        await act(async () => {
            fakeEditor.emit('selectionUpdate');
            fakeEditor.emit('selectionUpdate');
            fakeEditor.emit('update');
            await nextFrame();
        });

        expect(renderCount).toBe(initialRenderCount + 1);
    });

    it('can ignore content updates for selection-driven UI', async () => {
        const fakeEditor = new FakeEditor();
        let renderCount = 0;

        function Probe() {
            useEditorSnapshot(fakeEditor as unknown as TiptapEditor, { update: false });
            renderCount += 1;
            return null;
        }

        await act(async () => {
            root.render(<Probe />);
            await nextFrame();
        });

        const initialRenderCount = renderCount;

        await act(async () => {
            fakeEditor.emit('update');
            await nextFrame();
        });

        expect(renderCount).toBe(initialRenderCount);

        await act(async () => {
            fakeEditor.emit('selectionUpdate');
            await nextFrame();
        });

        expect(renderCount).toBe(initialRenderCount + 1);
    });
});
