import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BubbleMenuSelect } from '../../src/ui/popovers/BubbleMenuSelect';

describe('BubbleMenuSelect', () => {
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

    it('exposes listbox semantics and closes on outside click', () => {
        const onOpenChange = vi.fn();

        act(() => {
            root.render(
                <BubbleMenuSelect
                    ariaLabel="Block style"
                    open
                    onOpenChange={onOpenChange}
                    options={[
                        { key: 'paragraph', label: 'Paragraph', active: true, onSelect: vi.fn() },
                        { key: 'heading', label: 'Heading', onSelect: vi.fn() },
                    ]}
                >
                    Paragraph
                </BubbleMenuSelect>,
            );
        });

        const trigger = container.querySelector<HTMLButtonElement>('[aria-label="Block style"]');
        const listbox = container.querySelector('[role="listbox"]');
        const options = Array.from(container.querySelectorAll('[role="option"]'));

        expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox');
        expect(trigger?.getAttribute('aria-expanded')).toBe('true');
        expect(trigger?.getAttribute('aria-controls')).toBe(listbox?.id);
        expect(listbox).not.toBeNull();
        expect(options).toHaveLength(2);
        expect(options[0].getAttribute('aria-selected')).toBe('true');

        act(() => {
            document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        });

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('supports roving keyboard navigation and selection', () => {
        const onOpenChange = vi.fn();
        const selectParagraph = vi.fn();
        const selectHeading = vi.fn();

        act(() => {
            root.render(
                <BubbleMenuSelect
                    ariaLabel="Block style"
                    open
                    onOpenChange={onOpenChange}
                    options={[
                        {
                            key: 'paragraph',
                            label: 'Paragraph',
                            active: true,
                            onSelect: selectParagraph,
                        },
                        { key: 'heading', label: 'Heading', onSelect: selectHeading },
                    ]}
                >
                    Paragraph
                </BubbleMenuSelect>,
            );
        });

        const [paragraph, heading] = Array.from(
            container.querySelectorAll<HTMLButtonElement>('[role="option"]'),
        );

        act(() => {
            paragraph.focus();
            paragraph.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
            );
        });

        expect(document.activeElement).toBe(heading);

        act(() => {
            heading.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });

        expect(selectHeading).toHaveBeenCalledTimes(1);
        expect(selectParagraph).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
