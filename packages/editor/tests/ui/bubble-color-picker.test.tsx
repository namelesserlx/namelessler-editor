import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BubbleColorPicker } from '../../src/ui/popovers/BubbleColorPicker';

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
            getAttributes: vi.fn((name: string) => {
                if (name === 'textStyle') return {};
                if (name === 'highlight') return {};
                return {};
            }),
            chain: vi.fn(() => chainApi),
        },
        chainApi,
    };
}

describe('BubbleColorPicker', () => {
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

    it('renders a single palette popover with text and background sections', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<BubbleColorPicker editor={editor as never} locale="zh-CN" open />);
        });

        expect(
            container.querySelector('[data-nameless-editor-bubble-color-picker="true"]'),
        ).not.toBeNull();
        expect(container.textContent).toContain('文字颜色');
        expect(container.textContent).toContain('背景颜色');
        expect(
            container.querySelectorAll('[data-nameless-editor-bubble-color-swatch-mode="text"]'),
        ).toHaveLength(10);
        expect(
            container.querySelectorAll(
                '[data-nameless-editor-bubble-color-swatch-mode="background"]',
            ),
        ).toHaveLength(9);
    });

    it('applies background highlight colors from the combined palette', () => {
        const { editor, chainApi } = createEditorMock();

        act(() => {
            root.render(<BubbleColorPicker editor={editor as never} locale="zh-CN" open />);
        });

        act(() => {
            container
                .querySelector<HTMLButtonElement>(
                    '[data-nameless-editor-bubble-color-swatch-mode="background"][data-color-key="green"]',
                )
                ?.click();
        });

        expect(chainApi.focus).toHaveBeenCalledTimes(1);
        expect(chainApi.setHighlight).toHaveBeenCalledTimes(1);
        expect(chainApi.run).toHaveBeenCalledTimes(1);
    });

    it('renders background swatches as pure color blocks instead of letter swatches', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<BubbleColorPicker editor={editor as never} locale="zh-CN" open />);
        });

        const backgroundGreen = container.querySelector(
            '[data-nameless-editor-bubble-color-swatch-mode="background"][data-color-key="green"]',
        );

        expect(backgroundGreen?.textContent).toBe('');
    });

    it('uses aria labels without native browser title tooltips on swatches', () => {
        const { editor } = createEditorMock();

        act(() => {
            root.render(<BubbleColorPicker editor={editor as never} locale="zh-CN" open />);
        });

        const violetTextSwatch = container.querySelector(
            '[data-nameless-editor-bubble-color-swatch-mode="text"][data-color-key="violet"]',
        );

        expect(violetTextSwatch?.getAttribute('title')).toBeNull();
        expect(violetTextSwatch?.getAttribute('aria-label')).toBe('紫色');
    });

    it('accepts external text/background colors and custom swatch rendering', () => {
        const { editor, chainApi } = createEditorMock();

        act(() => {
            root.render(
                <BubbleColorPicker
                    editor={editor as never}
                    locale="en-US"
                    open
                    textColors={[
                        { key: 'clear', label: 'No text color', value: null },
                        { key: 'brandText', label: 'Brand text', value: '#5b21b6' },
                    ]}
                    backgroundColors={[
                        { key: 'brandBg', label: 'Brand background', value: '#ede9fe' },
                    ]}
                    renderSwatch={({ mode, option }) => (
                        <span data-custom-bubble-swatch={`${mode}-${option.key}`} />
                    )}
                />,
            );
        });

        expect(
            container.querySelectorAll('[data-nameless-editor-bubble-color-swatch-mode="text"]'),
        ).toHaveLength(2);
        expect(
            container.querySelectorAll(
                '[data-nameless-editor-bubble-color-swatch-mode="background"]',
            ),
        ).toHaveLength(1);
        expect(
            container.querySelector('[data-custom-bubble-swatch="background-brandBg"]'),
        ).not.toBeNull();

        act(() => {
            container.querySelector<HTMLButtonElement>('[aria-label="Brand background"]')?.click();
        });

        expect(chainApi.setHighlight).toHaveBeenCalledWith({ color: '#ede9fe' });
        expect(chainApi.run).toHaveBeenCalledTimes(1);
    });
});
