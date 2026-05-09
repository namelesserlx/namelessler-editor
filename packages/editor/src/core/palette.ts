import type { JSONContent } from '@tiptap/core';

/**
 * User-selectable color palette.
 * Single source of truth shared by ColorPicker (options) and
 * normalizePaletteColors (old-content hex → CSS var conversion).
 *
 * To add a new color, just append to the arrays below.
 * CSS variable definitions live in tokens.css under --nlx-palette-*.
 */

export interface PaletteColor {
    key: string;
    hex: string;
    cssVar: string;
}

export const TEXT_PALETTE: PaletteColor[] = [
    { key: 'slate', hex: '#0f172a', cssVar: 'var(--nlx-palette-text-slate)' },
    { key: 'red', hex: '#dc2626', cssVar: 'var(--nlx-palette-text-red)' },
    { key: 'orange', hex: '#ea580c', cssVar: 'var(--nlx-palette-text-orange)' },
    { key: 'amber', hex: '#b45309', cssVar: 'var(--nlx-palette-text-amber)' },
    { key: 'green', hex: '#15803d', cssVar: 'var(--nlx-palette-text-green)' },
    { key: 'cyan', hex: '#0e7490', cssVar: 'var(--nlx-palette-text-cyan)' },
    { key: 'blue', hex: '#2563eb', cssVar: 'var(--nlx-palette-text-blue)' },
    { key: 'violet', hex: '#7c3aed', cssVar: 'var(--nlx-palette-text-violet)' },
    { key: 'pink', hex: '#db2777', cssVar: 'var(--nlx-palette-text-pink)' },
];

export const BG_PALETTE: PaletteColor[] = [
    { key: 'red', hex: '#fee2e2', cssVar: 'var(--nlx-palette-bg-red)' },
    { key: 'orange', hex: '#ffedd5', cssVar: 'var(--nlx-palette-bg-orange)' },
    { key: 'amber', hex: '#fef3c7', cssVar: 'var(--nlx-palette-bg-amber)' },
    { key: 'green', hex: '#dcfce7', cssVar: 'var(--nlx-palette-bg-green)' },
    { key: 'cyan', hex: '#cffafe', cssVar: 'var(--nlx-palette-bg-cyan)' },
    { key: 'blue', hex: '#dbeafe', cssVar: 'var(--nlx-palette-bg-blue)' },
    { key: 'violet', hex: '#ede9fe', cssVar: 'var(--nlx-palette-bg-violet)' },
    { key: 'pink', hex: '#fce7f3', cssVar: 'var(--nlx-palette-bg-pink)' },
];

/** Fast lookup: hex → CSS variable reference for text colors */
export const TEXT_HEX_TO_CSS_VAR: Record<string, string> = Object.fromEntries(
    TEXT_PALETTE.map((c) => [c.hex, c.cssVar]),
);

/** Fast lookup: hex → CSS variable reference for background colors */
export const BG_HEX_TO_CSS_VAR: Record<string, string> = Object.fromEntries(
    BG_PALETTE.map((c) => [c.hex, c.cssVar]),
);

/**
 * Walk a JSONContent tree and convert known palette hex colors in
 * textStyle / highlight marks to their CSS variable references.
 * Enables automatic dark mode adaptation for old content.
 */
export function normalizePaletteColors(doc: JSONContent): JSONContent {
    function walk(node: JSONContent): void {
        if (node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'textStyle' && mark.attrs?.color) {
                    const cssVar = TEXT_HEX_TO_CSS_VAR[mark.attrs.color];
                    if (cssVar) mark.attrs.color = cssVar;
                }
                if (mark.type === 'highlight' && mark.attrs?.color) {
                    const cssVar = BG_HEX_TO_CSS_VAR[mark.attrs.color];
                    if (cssVar) mark.attrs.color = cssVar;
                }
            }
        }
        if (node.content) {
            for (const child of node.content) {
                walk(child);
            }
        }
    }

    walk(doc);
    return doc;
}
