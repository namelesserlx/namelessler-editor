import { act, type CSSProperties, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultBubbleMenu } from '../../src/ui/DefaultBubbleMenu';

vi.mock('@tiptap/react/menus', () => ({
    BubbleMenu: ({
        children,
        className,
        style,
    }: {
        children: ReactNode;
        className?: string;
        style?: CSSProperties;
    }) => (
        <div className={className} style={style} data-nameless-editor-bubble-menu="true">
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

function createEditorMock() {
    const chainApi = {
        focus: vi.fn(() => chainApi),
        setParagraph: vi.fn(() => chainApi),
        toggleHeading: vi.fn(() => chainApi),
        setTextAlign: vi.fn(() => chainApi),
        toggleBold: vi.fn(() => chainApi),
        toggleStrike: vi.fn(() => chainApi),
        toggleItalic: vi.fn(() => chainApi),
        toggleUnderline: vi.fn(() => chainApi),
        toggleCode: vi.fn(() => chainApi),
        toggleBlockquote: vi.fn(() => chainApi),
        run: vi.fn(),
    };
    const events = new FakeEditorEvents();

    return {
        chainApi,
        editor: {
            isEditable: true,
            state: {
                selection: {
                    from: 1,
                    to: 8,
                },
            },
            isActive: vi.fn((name: string | { textAlign: string }, attrs?: { level?: number }) => {
                if (typeof name === 'string') {
                    if (name === 'paragraph') return true;
                    if (name === 'heading') return attrs?.level === 1 ? false : false;
                    return false;
                }

                return name.textAlign === 'left';
            }),
            getAttributes: vi.fn((name: string) => {
                if (name === 'textStyle') return {};
                if (name === 'highlight') return {};
                if (name === 'link') return {};
                return {};
            }),
            chain: vi.fn(() => chainApi),
            on: vi.fn((event: string, listener: Listener) => events.on(event, listener)),
            off: vi.fn((event: string, listener: Listener) => events.off(event, listener)),
        },
    };
}

describe('DefaultBubbleMenu UI', () => {
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

    it('renders compact style, alignment, formatting, and single palette controls', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<DefaultBubbleMenu editor={editor as never} locale="zh-CN" />);
        });

        expect(
            container.querySelector('[data-nameless-editor-style-trigger="true"]')?.textContent,
        ).toContain('正文');
        expect(
            container.querySelector('[data-nameless-editor-align-trigger="true"]'),
        ).not.toBeNull();
        expect(
            container.querySelectorAll('[data-nameless-editor-bubble-color-picker-trigger="true"]'),
        ).toHaveLength(1);
    });

    it('applies format and alignment commands from the compact bubble controls', () => {
        const { editor, chainApi } = createEditorMock();

        act(() => {
            root.render(<DefaultBubbleMenu editor={editor as never} locale="zh-CN" />);
        });

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-style-trigger="true"]')
                ?.click();
        });

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-style-option="heading-2"]')
                ?.click();
        });

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-align-trigger="true"]')
                ?.click();
        });

        expect(container.querySelector('[data-nameless-editor-align-option="justify"]')).toBeNull();

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-align-option="center"]')
                ?.click();
        });

        expect(chainApi.focus).toHaveBeenCalled();
        expect(chainApi.toggleHeading).toHaveBeenCalledWith({ level: 2 });
        expect(chainApi.setTextAlign).toHaveBeenCalledWith('center');
    });

    it('renders the link editor as an inline second row under the bubble menu', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<DefaultBubbleMenu editor={editor as never} locale="zh-CN" />);
        });

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="链接"]')?.click();
        });

        expect(
            container.querySelector('[data-nameless-editor-bubble-link-panel="true"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-nameless-editor-link-popover="true"]')).toBeNull();
        expect(
            container.querySelector<HTMLInputElement>('[data-nameless-editor-link-input="true"]')
                ?.placeholder,
        ).toBe('输入链接地址...');
    });
});
