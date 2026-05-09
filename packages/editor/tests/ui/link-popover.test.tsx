import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkPopover } from '../../src/ui/LinkPopover';

function createEditorMock(href = '') {
    const run = vi.fn();
    const chainApi = {
        focus: vi.fn(() => chainApi),
        extendMarkRange: vi.fn(() => chainApi),
        setLink: vi.fn(() => chainApi),
        unsetLink: vi.fn(() => chainApi),
        run,
    };

    return {
        editor: {
            isActive: vi.fn((name: string) => name === 'link' && Boolean(href)),
            getAttributes: vi.fn((name: string) => (name === 'link' ? { href } : {})),
            chain: vi.fn(() => chainApi),
        },
        chainApi,
    };
}

describe('LinkPopover', () => {
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

    it('prefills the current link href when opened', () => {
        const { editor } = createEditorMock('https://example.com/article');

        act(() => {
            root.render(<LinkPopover editor={editor as never} locale="en-US" selectionKey="1:8" />);
        });

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="Link"]')?.click();
        });

        expect(
            container.querySelector<HTMLInputElement>('[data-nameless-editor-link-input="true"]')
                ?.value,
        ).toBe('https://example.com/article');
    });

    it('closes the stale link popover when the editor selection changes', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<LinkPopover editor={editor as never} locale="en-US" selectionKey="1:8" />);
        });

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="Link"]')?.click();
        });

        expect(
            container.querySelector('[data-nameless-editor-link-popover="true"]'),
        ).not.toBeNull();

        act(() => {
            root.render(
                <LinkPopover editor={editor as never} locale="en-US" selectionKey="9:14" />,
            );
        });

        expect(container.querySelector('[data-nameless-editor-link-popover="true"]')).toBeNull();
    });

    it('closes the popover after clearing an empty link input', () => {
        const { editor, chainApi } = createEditorMock();

        act(() => {
            root.render(<LinkPopover editor={editor as never} locale="en-US" selectionKey="1:8" />);
        });

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="Link"]')?.click();
        });

        act(() => {
            container
                .querySelector<HTMLButtonElement>('[data-nameless-editor-link-save="true"]')
                ?.click();
        });

        expect(chainApi.unsetLink).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-nameless-editor-link-popover="true"]')).toBeNull();
    });

    it('renders localized empty-state actions for a new link', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<LinkPopover editor={editor as never} locale="zh-CN" selectionKey="1:8" />);
        });

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="链接"]')?.click();
        });

        expect(
            container.querySelector<HTMLInputElement>('[data-nameless-editor-link-input="true"]')
                ?.placeholder,
        ).toBe('输入链接地址...');
        expect(
            container.querySelector('[data-nameless-editor-link-confirm="true"]')?.textContent,
        ).toBe('确定');
        expect(
            container.querySelector('[data-nameless-editor-link-cancel="true"]')?.textContent,
        ).toBe('取消');
        expect(container.querySelector('[data-nameless-editor-link-remove="true"]')).toBeNull();
    });

    it('shows the unlink action when editing an existing link', () => {
        const { editor } = createEditorMock('https://example.com/article');

        act(() => {
            root.render(<LinkPopover editor={editor as never} locale="en-US" selectionKey="1:8" />);
        });

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="Link"]')?.click();
        });

        expect(container.querySelector('[data-nameless-editor-link-remove="true"]')).not.toBeNull();
        expect(container.querySelector('[data-nameless-editor-link-cancel="true"]')).toBeNull();
    });
});
