import { act, type CSSProperties, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultBubbleMenu } from '../../src/ui/menus/DefaultBubbleMenu';

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

    it('exposes the selected style label as the bubble menu select tooltip', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<DefaultBubbleMenu editor={editor as never} locale="zh-CN" />);
        });

        const styleTrigger = container.querySelector('[data-nameless-editor-style-trigger="true"]');
        const tooltipHost = styleTrigger?.closest('[data-nameless-editor-tooltip]');

        expect(tooltipHost?.getAttribute('data-nameless-editor-tooltip')).toBe('正文');
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
                .querySelector<HTMLButtonElement>('[data-nameless-editor-style-trigger="true"]')
                ?.click();
        });

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-style-option="heading-4"]')
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
        expect(chainApi.toggleHeading).toHaveBeenCalledWith({ level: 4 });
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

    it('lets callers replace default bubble menu commands with a registry', () => {
        const { editor } = createEditorMock();
        const customAction = vi.fn();

        act(() => {
            root.render(
                <DefaultBubbleMenu
                    editor={editor as never}
                    locale="zh-CN"
                    commands={(defaults) => [
                        ...defaults.filter((command) => command.id === 'bold'),
                        {
                            id: 'ai-polish',
                            group: 'ai',
                            render: () => (
                                <button
                                    type="button"
                                    data-nameless-editor-ai-polish="true"
                                    onClick={customAction}
                                >
                                    AI polish
                                </button>
                            ),
                        },
                    ]}
                />,
            );
        });

        expect(container.querySelector('[data-nameless-editor-style-trigger="true"]')).toBeNull();
        expect(container.querySelector<HTMLButtonElement>('[aria-label="加粗"]')).not.toBeNull();

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-ai-polish="true"]')
                ?.click();
        });

        expect(customAction).toHaveBeenCalledTimes(1);
    });

    it('gives custom bubble menu commands controlled popover state and close helpers', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(
                <DefaultBubbleMenu
                    editor={editor as never}
                    locale="zh-CN"
                    commands={(defaults, context) => [
                        ...defaults.filter((command) => command.id === 'style'),
                        {
                            id: 'ai',
                            group: 'ai',
                            render: () => {
                                const open = context.activePopover === 'ai';

                                return (
                                    <span>
                                        <button
                                            type="button"
                                            data-nameless-editor-ai-trigger="true"
                                            aria-expanded={open}
                                            onClick={() => context.setPopoverOpen('ai')(!open)}
                                        >
                                            AI
                                        </button>
                                        {open ? (
                                            <span data-nameless-editor-ai-popover="true">
                                                AI actions
                                                <button
                                                    type="button"
                                                    data-nameless-editor-ai-close="true"
                                                    onClick={context.closePopovers}
                                                >
                                                    Close
                                                </button>
                                            </span>
                                        ) : null}
                                    </span>
                                );
                            },
                        },
                    ]}
                />,
            );
        });

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-style-trigger="true"]')
                ?.click();
        });
        expect(
            container.querySelector('[data-nameless-editor-style-option="heading-1"]'),
        ).not.toBeNull();

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-ai-trigger="true"]')
                ?.click();
        });

        expect(container.querySelector('[data-nameless-editor-ai-popover="true"]')).not.toBeNull();
        expect(
            container.querySelector('[data-nameless-editor-style-option="heading-1"]'),
        ).toBeNull();

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-ai-close="true"]')
                ?.click();
        });

        expect(container.querySelector('[data-nameless-editor-ai-popover="true"]')).toBeNull();
    });
});
