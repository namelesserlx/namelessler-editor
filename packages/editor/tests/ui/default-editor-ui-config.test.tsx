import { act, type CSSProperties, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultEditorUi } from '../../src/ui/shell/DefaultEditorUi';

vi.mock('@tiptap/react/menus', () => ({
    BubbleMenu: ({
        children,
        className,
        style,
        ...props
    }: {
        children: ReactNode;
        className?: string;
        style?: CSSProperties;
    }) => (
        <div className={className} style={style} {...props}>
            {children}
        </div>
    ),
}));

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
}

function installResizeObserver() {
    Object.defineProperty(window, 'ResizeObserver', {
        configurable: true,
        value: class ResizeObserver {
            disconnect() {}
            observe() {}
            unobserve() {}
        },
    });
}

function createEditorMock() {
    const chainApi = {
        focus: vi.fn(() => chainApi),
        setParagraph: vi.fn(() => chainApi),
        toggleHeading: vi.fn(() => chainApi),
        setTextAlign: vi.fn(() => chainApi),
        toggleBold: vi.fn(() => chainApi),
        toggleItalic: vi.fn(() => chainApi),
        toggleUnderline: vi.fn(() => chainApi),
        toggleStrike: vi.fn(() => chainApi),
        toggleCode: vi.fn(() => chainApi),
        toggleBlockquote: vi.fn(() => chainApi),
        setColor: vi.fn(() => chainApi),
        unsetColor: vi.fn(() => chainApi),
        setHighlight: vi.fn(() => chainApi),
        unsetHighlight: vi.fn(() => chainApi),
        undo: vi.fn(() => chainApi),
        redo: vi.fn(() => chainApi),
        run: vi.fn(),
    };
    const events = new FakeEditorEvents();
    const editorDom = document.createElement('div');

    return {
        state: {
            selection: {
                from: 1,
                to: 8,
            },
        },
        view: {
            dom: editorDom,
            domAtPos: vi.fn(() => ({ node: editorDom })),
        },
        isEditable: true,
        isActive: vi.fn(() => false),
        getAttributes: vi.fn(() => ({})),
        chain: vi.fn(() => chainApi),
        can: vi.fn(() => ({
            undo: vi.fn(() => true),
            redo: vi.fn(() => true),
        })),
        on: vi.fn((event: string, listener: Listener) => events.on(event, listener)),
        off: vi.fn((event: string, listener: Listener) => events.off(event, listener)),
    };
}

describe('DefaultEditorUi config', () => {
    let container: HTMLDivElement;
    let root: Root;
    let originalResizeObserver: typeof window.ResizeObserver | undefined;

    beforeEach(() => {
        originalResizeObserver = window.ResizeObserver;
        installResizeObserver();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        Object.defineProperty(window, 'ResizeObserver', {
            configurable: true,
            value: originalResizeObserver,
        });
    });

    it('passes bubble menu commands and color picker options from ui config to default UI', () => {
        const editor = createEditorMock();

        act(() => {
            root.render(
                <DefaultEditorUi
                    editor={editor as never}
                    locale="en-US"
                    ui={{
                        bubbleMenu: {
                            commands: [
                                {
                                    id: 'ai',
                                    group: 'ai',
                                    render: () => (
                                        <button type="button" data-nameless-editor-config-ai="true">
                                            AI
                                        </button>
                                    ),
                                },
                            ],
                        },
                        colorPicker: {
                            textColors: [
                                { key: 'clear', label: 'No color', value: null },
                                { key: 'brand', label: 'Brand purple', value: '#6d28d9' },
                            ],
                            renderSwatch: ({ option }) => <span data-config-swatch={option.key} />,
                        },
                    }}
                />,
            );
        });

        expect(container.querySelector('[data-nameless-editor-config-ai="true"]')).not.toBeNull();
        expect(container.querySelector('[data-nameless-editor-style-trigger="true"]')).toBeNull();

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="Text color"]')?.click();
        });

        expect(container.querySelectorAll('[role="menuitemradio"]')).toHaveLength(2);
        expect(container.querySelector('[data-config-swatch="brand"]')).not.toBeNull();
    });
});
