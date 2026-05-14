import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultEditorUi } from '../../src/ui/shell/DefaultEditorUi';
import { EditorTooltipProvider } from '../../src/ui/tooltip/EditorTooltipProvider';
import { TooltipTrigger } from '../../src/ui/tooltip/TooltipTrigger';

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
    };
}

describe('Editor tooltip', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement('div');
        container.style.overflow = 'hidden';
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        document.body
            .querySelectorAll('[data-nameless-editor-tooltip-portal="true"]')
            .forEach((node) => {
                node.remove();
            });
        vi.useRealTimers();
    });

    it('renders default UI tooltips through a body portal instead of inside the toolbar', () => {
        act(() => {
            root.render(<DefaultEditorUi editor={createEditorMock() as never} locale="en-US" />);
        });

        const boldButton = container.querySelector<HTMLButtonElement>('[aria-label="Bold"]');
        expect(boldButton).not.toBeNull();

        act(() => {
            boldButton?.dispatchEvent(new Event('pointerover', { bubbles: true }));
            vi.advanceTimersByTime(300);
        });

        const tooltip = document.body.querySelector<HTMLElement>('[role="tooltip"]');
        expect(tooltip).not.toBeNull();
        expect(tooltip?.textContent).toBe('Bold');
        expect(container.contains(tooltip)).toBe(false);
        expect(tooltip?.getAttribute('data-nameless-editor-tooltip-portal')).toBe('true');
    });

    it('connects focused toolbar controls to the portal tooltip with aria-describedby', () => {
        act(() => {
            root.render(<DefaultEditorUi editor={createEditorMock() as never} locale="en-US" />);
        });

        const italicButton = container.querySelector<HTMLButtonElement>('[aria-label="Italic"]');
        expect(italicButton).not.toBeNull();

        act(() => {
            italicButton?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        });

        const tooltip = document.body.querySelector<HTMLElement>('[role="tooltip"]');
        expect(tooltip).not.toBeNull();
        expect(tooltip?.textContent).toBe('Italic');
        expect(italicButton?.getAttribute('aria-describedby')).toBe(tooltip?.id);

        act(() => {
            italicButton?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        });

        expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
        expect(italicButton?.hasAttribute('aria-describedby')).toBe(false);
    });

    it('can disable portal tooltips through the ui config', () => {
        act(() => {
            root.render(
                <DefaultEditorUi
                    editor={createEditorMock() as never}
                    locale="en-US"
                    ui={{ tooltip: false }}
                />,
            );
        });

        const boldButton = container.querySelector<HTMLButtonElement>('[aria-label="Bold"]');
        expect(boldButton).not.toBeNull();

        act(() => {
            boldButton?.dispatchEvent(new Event('pointerover', { bubbles: true }));
            vi.advanceTimersByTime(300);
        });

        expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('shows tooltips for controls rendered inside Tiptap bubble menu portals', () => {
        function BubblePortalControl() {
            return createPortal(
                <div data-nameless-editor-bubble-menu="true">
                    <TooltipTrigger label="Paragraph">
                        <button type="button" aria-label="Paragraph">
                            Paragraph
                        </button>
                    </TooltipTrigger>
                </div>,
                document.body,
            );
        }

        act(() => {
            root.render(
                <EditorTooltipProvider delay={0}>
                    <button type="button">Editor root</button>
                    <BubblePortalControl />
                </EditorTooltipProvider>,
            );
        });

        const trigger = document.body.querySelector<HTMLButtonElement>('[aria-label="Paragraph"]');
        expect(trigger).not.toBeNull();

        act(() => {
            trigger?.dispatchEvent(new Event('pointerover', { bubbles: true }));
        });

        const tooltip = document.body.querySelector<HTMLElement>('[role="tooltip"]');
        expect(tooltip).not.toBeNull();
        expect(tooltip?.textContent).toBe('Paragraph');
    });
});
