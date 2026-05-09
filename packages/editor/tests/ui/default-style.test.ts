import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(join(currentDir, '../../src/styles/default.css'), 'utf8');

describe('default editor styles', () => {
    it('renders blockquotes as a visible quote block instead of a plain indent', () => {
        expect(styles).toContain("[data-nameless-editor-content='true'] blockquote");
        expect(styles).toContain("[data-nameless-editor-readonly='true'] blockquote");
        expect(styles).toContain('border-left: 3px solid var(--nlx-blockquote-border);');
        expect(styles).toContain('background: var(--nlx-color-surface);');
    });

    it('keeps popover action labels on one line', () => {
        expect(styles).toContain('white-space: nowrap;');
        expect(styles).toContain("[data-nameless-editor-link-save='true']");
        expect(styles).toContain('min-width: 48px;');
    });

    it('renders inline code as a visible code mark outside code blocks', () => {
        expect(styles).toContain("[data-nameless-editor-content='true'] code:not(pre code)");
        expect(styles).toContain("[data-nameless-editor-readonly='true'] code:not(pre code)");
        expect(styles).toContain('background: var(--nlx-code-inline-bg);');
        expect(styles).toContain('font-family: var(--nlx-font-mono);');
    });

    it('uses an elevated shell style for toolbar and floating popovers', () => {
        expect(styles).toContain('.nlx-editor-toolbar');
        expect(styles).toContain('border-radius: 10px;');
        expect(styles).toContain('box-shadow: var(--nlx-shadow-sm);');
        expect(styles).not.toContain('.nlx-editor-slash-menu');
        expect(styles).not.toContain('.nlx-editor-slash-item');
        expect(styles).toContain('background: var(--nlx-color-primary-soft);');
        expect(styles).toContain('transform: translateY(-1px);');
    });

    it('styles GFM content nodes consistently with the default UI', () => {
        expect(styles).toContain("[data-nameless-editor-content='true'] table");
        expect(styles).toContain("[data-nameless-editor-readonly='true'] table");
        expect(styles).toContain("[data-nameless-editor-content='true'] ul[data-type='taskList']");
        expect(styles).toContain("[data-nameless-editor-content='true'] hr");
        expect(styles).toContain('background: var(--nlx-color-surface);');
    });

    it('keeps table column resize handles from changing table layout on hover', () => {
        const resizeHandleRule = styles.match(/\.column-resize-handle\s*{[^}]*}/)?.[0] ?? '';

        expect(resizeHandleRule).toContain('bottom: 0;');
        expect(resizeHandleRule).toContain('pointer-events: none;');
        expect(resizeHandleRule).not.toContain('bottom: -2px;');
    });

    it('uses CSS variables from the token system for all themeable colors', () => {
        // Verify no raw color values in critical UI elements
        expect(styles).not.toContain('var(--ck-');
    });
});
