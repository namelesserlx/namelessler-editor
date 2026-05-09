import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TableBubbleMenu } from '../../src/ui/TableBubbleMenu';

type Listener = () => void;

class FakeEditorEvents {
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

function createRect(left: number, top: number, width: number, height: number): DOMRect {
    return {
        bottom: top + height,
        height,
        left,
        right: left + width,
        top,
        width,
        x: left,
        y: top,
        toJSON: () => ({}),
    };
}

function createEditorDom() {
    const editorDom = document.createElement('div');
    const wrapper = document.createElement('div');
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    const paragraph = document.createElement('p');

    wrapper.className = 'tableWrapper';
    paragraph.textContent = 'Cell';
    cell.appendChild(paragraph);
    row.appendChild(cell);
    tbody.appendChild(row);
    table.appendChild(tbody);
    wrapper.appendChild(table);
    editorDom.appendChild(wrapper);

    wrapper.getBoundingClientRect = () => createRect(24, 80, 240, 60);
    document.body.appendChild(editorDom);

    return { editorDom, cell };
}

function createEditorMock(editorDom: HTMLElement) {
    const events = new FakeEditorEvents();

    return {
        isEditable: true,
        isActive: vi.fn(() => false),
        state: {
            selection: {
                from: 1,
                to: 1,
            },
        },
        view: {
            dom: editorDom,
            domAtPos: vi.fn(() => ({ node: editorDom })),
        },
        on: vi.fn((event: string, listener: Listener) => events.on(event, listener)),
        off: vi.fn((event: string, listener: Listener) => events.off(event, listener)),
        emit: (event: string) => events.emit(event),
        chain: vi.fn(() => ({
            focus: vi.fn().mockReturnThis(),
            addColumnBefore: vi.fn().mockReturnThis(),
            addColumnAfter: vi.fn().mockReturnThis(),
            deleteColumn: vi.fn().mockReturnThis(),
            addRowBefore: vi.fn().mockReturnThis(),
            addRowAfter: vi.fn().mockReturnThis(),
            deleteRow: vi.fn().mockReturnThis(),
            run: vi.fn(),
        })),
    };
}

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

describe('TableBubbleMenu', () => {
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

    it('opens when the pointer hovers a table without requiring the editor selection to be inside it', () => {
        const { editorDom, cell } = createEditorDom();
        const editor = createEditorMock(editorDom);

        act(() => {
            root.render(<TableBubbleMenu editor={editor as never} locale="en-US" />);
        });

        act(() => {
            cell.dispatchEvent(
                new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: 32,
                    clientY: 96,
                }),
            );
        });

        const menu = document.body.querySelector<HTMLElement>('.nlx-editor-table-bubble-menu');

        expect(menu).not.toBeNull();
        expect(menu?.style.left).toBe('144px');
        expect(menu?.style.top).toBe('72px');
    });

    it('does not recalculate table state on content-only editor updates', async () => {
        const { editorDom } = createEditorDom();
        const editor = createEditorMock(editorDom);

        await act(async () => {
            root.render(<TableBubbleMenu editor={editor as never} locale="en-US" />);
            await nextFrame();
        });

        const activeChecksAfterRender = editor.isActive.mock.calls.length;

        await act(async () => {
            editor.emit('update');
            await nextFrame();
        });

        expect(editor.isActive).toHaveBeenCalledTimes(activeChecksAfterRender);

        await act(async () => {
            editor.emit('selectionUpdate');
            await nextFrame();
        });

        expect(editor.isActive.mock.calls.length).toBeGreaterThan(activeChecksAfterRender);
    });
});
