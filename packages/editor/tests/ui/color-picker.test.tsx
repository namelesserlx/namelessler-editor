import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorPicker } from '../../src/ui/ColorPicker';

function createEditorMock() {
    const chainApi = {
        focus: vi.fn(() => chainApi),
        setColor: vi.fn(() => chainApi),
        unsetColor: vi.fn(() => chainApi),
        setHighlight: vi.fn(() => chainApi),
        unsetHighlight: vi.fn(() => chainApi),
        run: vi.fn(),
    };

    return {
        editor: {
            getAttributes: vi.fn(() => ({})),
            chain: vi.fn(() => chainApi),
        },
        chainApi,
    };
}

describe('ColorPicker', () => {
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

    it('supports localized labels and a controlled single-open palette state', () => {
        const { editor } = createEditorMock();

        function Harness() {
            const [activePicker, setActivePicker] = useState<'text' | 'background' | null>(null);

            return (
                <>
                    <ColorPicker
                        editor={editor as never}
                        locale="zh-CN"
                        mode="text"
                        open={activePicker === 'text'}
                        onOpenChange={(open) => setActivePicker(open ? 'text' : null)}
                    />
                    <ColorPicker
                        editor={editor as never}
                        locale="zh-CN"
                        mode="background"
                        open={activePicker === 'background'}
                        onOpenChange={(open) => setActivePicker(open ? 'background' : null)}
                    />
                </>
            );
        }

        act(() => {
            root.render(<Harness />);
        });

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="文字颜色"]')?.click();
        });

        expect(
            container.querySelectorAll('[data-nameless-editor-color-picker="true"]'),
        ).toHaveLength(1);
        expect(container.textContent).toContain('文字颜色');

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="背景颜色"]')?.click();
        });

        expect(
            container.querySelectorAll('[data-nameless-editor-color-picker="true"]'),
        ).toHaveLength(1);
        expect(container.textContent).not.toContain('文字颜色');
        expect(container.textContent).toContain('背景颜色');
    });

    it('does not render the clear swatch as active when no color is applied', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<ColorPicker editor={editor as never} locale="zh-CN" mode="text" open />);
        });

        const clearSwatch = container.querySelector('[aria-label="清除"]');
        expect(clearSwatch).not.toBeNull();
        expect(clearSwatch?.classList.contains('nlx-editor-color-swatch-active')).toBe(false);
    });
});
