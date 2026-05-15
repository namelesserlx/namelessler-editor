import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const readStyle = (file: string) =>
    readFileSync(join(currentDir, `../../src/styles/${file}`), 'utf8');

const entryStyle = readFileSync(join(currentDir, '../../src/style.css'), 'utf8');
const contentStyles = readStyle('content.css');
const toolbarStyles = readStyle('toolbar.css');
const bubbleMenuStyles = readStyle('bubble-menu.css');
const popoverStyles = readStyle('popovers.css');
const tableStyles = readStyle('table.css');

describe('default editor styles', () => {
    it('keeps a single public style entrypoint', () => {
        expect(entryStyle).toContain("@import './styles/index.css';");
    });

    it('styles prose content through a shared content scope', () => {
        expect(contentStyles).toContain('.nlx-editor-prose :where(blockquote)');
        expect(contentStyles).toContain('.nlx-editor-prose :where(code:not(pre code))');
        expect(contentStyles).toContain('.nlx-editor-prose :where(table)');
        expect(contentStyles).toContain(".nlx-editor-prose :where(ul[data-type='taskList'])");
    });

    it('keeps toolbar controls on a shared visual language', () => {
        expect(toolbarStyles).toContain('.nlx-editor-toolbar');
        expect(toolbarStyles).toContain('.nlx-editor-button');
        expect(toolbarStyles).toContain('.nlx-editor-button-active');
        expect(toolbarStyles).not.toContain('.nlx-editor-slash-menu');
    });

    it('keeps bubble menu styles isolated from toolbar and prose styles', () => {
        expect(bubbleMenuStyles).toContain('.nlx-editor-bubble-menu');
        expect(bubbleMenuStyles).toContain('.nlx-editor-bubble-menu-select-trigger');
        expect(bubbleMenuStyles).toContain('.nlx-editor-bubble-link-panel');
        expect(bubbleMenuStyles).toContain('.nlx-editor-bubble-color-popover');
    });

    it('keeps popovers and tooltips in the overlay stylesheet', () => {
        expect(popoverStyles).toContain('.nlx-editor-tooltip');
        expect(popoverStyles).toContain('.nlx-editor-popover');
        expect(popoverStyles).toContain('.nlx-editor-input');
        expect(popoverStyles).toContain('.nlx-editor-color-swatch');
    });

    it('keeps table editing affordances in the table stylesheet', () => {
        expect(tableStyles).toContain('.column-resize-handle');
        expect(tableStyles).toContain('.nlx-editor-table-bubble-menu');
    });
});
