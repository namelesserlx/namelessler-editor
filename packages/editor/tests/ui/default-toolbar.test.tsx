import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultToolbar } from '../../src/ui/toolbar/DefaultToolbar';
import type { ToolbarCommand } from '../../src/ui/toolbar/toolbarCommands';

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

function createEditorMock() {
    const chainApi = {
        focus: vi.fn(() => chainApi),
        setParagraph: vi.fn(() => chainApi),
        toggleHeading: vi.fn(() => chainApi),
        toggleBold: vi.fn(() => chainApi),
        toggleItalic: vi.fn(() => chainApi),
        toggleUnderline: vi.fn(() => chainApi),
        toggleStrike: vi.fn(() => chainApi),
        toggleCode: vi.fn(() => chainApi),
        toggleBulletList: vi.fn(() => chainApi),
        toggleOrderedList: vi.fn(() => chainApi),
        toggleTaskList: vi.fn(() => chainApi),
        toggleBlockquote: vi.fn(() => chainApi),
        toggleCodeBlock: vi.fn(() => chainApi),
        insertTable: vi.fn(() => chainApi),
        setHorizontalRule: vi.fn(() => chainApi),
        setTextAlign: vi.fn(() => chainApi),
        undo: vi.fn(() => chainApi),
        redo: vi.fn(() => chainApi),
        run: vi.fn(),
    };
    const events = new FakeEditorEvents();

    return {
        state: {
            selection: {
                from: 1,
                to: 1,
            },
        },
        isActive: vi.fn(() => false),
        getAttributes: vi.fn(() => ({})),
        chain: vi.fn(() => chainApi),
        can: vi.fn(() => ({
            undo: vi.fn(() => true),
            redo: vi.fn(() => true),
        })),
        on: vi.fn((event: string, listener: Listener) => events.on(event, listener)),
        off: vi.fn((event: string, listener: Listener) => events.off(event, listener)),
        emit: (event: string) => events.emit(event),
    };
}

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

describe('DefaultToolbar', () => {
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

    it('wraps toolbar buttons with localized tooltip hosts', () => {
        act(() => {
            root.render(<DefaultToolbar editor={createEditorMock() as never} locale="zh-CN" />);
        });

        const toolbar = container.querySelector('[data-nameless-editor-toolbar="true"]');
        expect(toolbar).not.toBeNull();

        const buttons = Array.from(toolbar?.querySelectorAll('.nlx-editor-button') ?? []);
        expect(buttons.length).toBeGreaterThan(0);

        for (const button of buttons) {
            const tooltipHost = button.closest('.nlx-editor-tooltip-host');
            expect(tooltipHost).not.toBeNull();
            expect(tooltipHost?.getAttribute('data-nameless-editor-tooltip')).toBeTruthy();
        }

        expect(toolbar?.querySelector('[data-nameless-editor-tooltip="正文"]')).not.toBeNull();
        expect(toolbar?.querySelector('[data-nameless-editor-tooltip="标题 1"]')).not.toBeNull();
        expect(toolbar?.querySelector('[data-nameless-editor-tooltip="标题 4"]')).not.toBeNull();
        expect(toolbar?.querySelector('[data-nameless-editor-tooltip="加粗"]')).not.toBeNull();
        expect(toolbar?.querySelector('[data-nameless-editor-tooltip="撤销"]')).not.toBeNull();
    });

    it('does not render a dead link button when the link popover is disabled', () => {
        act(() => {
            root.render(
                <DefaultToolbar
                    editor={createEditorMock() as never}
                    locale="en-US"
                    linkPopover={false}
                />,
            );
        });

        expect(container.querySelector('[aria-label="Link"]')).toBeNull();
    });

    it('does not re-render on content-only editor updates', async () => {
        const editor = createEditorMock();

        await act(async () => {
            root.render(<DefaultToolbar editor={editor as never} locale="en-US" />);
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

    it('supports toolbar slots and command registry overrides', () => {
        const editor = createEditorMock();
        const customCommand = vi.fn();
        const customCommands = (defaults: ToolbarCommand[]): ToolbarCommand[] => [
            ...defaults.filter((command) => command.id !== 'heading-3'),
            {
                id: 'custom-action',
                group: 'history',
                render: () => (
                    <button
                        type="button"
                        data-nameless-editor-custom-toolbar-command="true"
                        onClick={customCommand}
                    >
                        Custom
                    </button>
                ),
            },
        ];

        act(() => {
            root.render(
                <DefaultToolbar
                    editor={editor as never}
                    locale="en-US"
                    commands={customCommands}
                    slots={[
                        {
                            key: 'before',
                            placement: 'start',
                            render: () => (
                                <span data-nameless-editor-toolbar-slot="start">Start</span>
                            ),
                        },
                        {
                            key: 'after',
                            placement: 'end',
                            render: () => <span data-nameless-editor-toolbar-slot="end">End</span>,
                        },
                    ]}
                />,
            );
        });

        expect(container.querySelector('[aria-label="Heading 3"]')).toBeNull();
        expect(
            container.querySelector('[data-nameless-editor-toolbar-slot="start"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-nameless-editor-toolbar-slot="end"]')).not.toBeNull();

        act(() => {
            container
                .querySelector<HTMLButtonElement>(
                    '[data-nameless-editor-custom-toolbar-command="true"]',
                )
                ?.click();
        });

        expect(customCommand).toHaveBeenCalledTimes(1);
    });
});
