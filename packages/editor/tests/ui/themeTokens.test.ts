import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('theme tokens', () => {
    it('keeps the default primary color aligned with the existing Ant Design blue theme', () => {
        const tokens = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf8');

        expect(tokens).toMatch(/--nlx-color-primary:\s+#1677ff/);
        expect(tokens).toMatch(/--nlx-color-primary-hover:\s+#4096ff/);
        expect(tokens).not.toContain('--ck-');
        expect(tokens).not.toContain('accent');
    });

    it('uses nlx- prefix for all tokens', () => {
        const tokens = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf8');

        expect(tokens).toContain('--nlx-font-sans');
        expect(tokens).toContain('--nlx-color-text');
        expect(tokens).toContain('--nlx-color-primary');
        expect(tokens).toContain('--nlx-color-surface');
        expect(tokens).toContain('--nlx-color-border');
    });

    it('uses nlx-editor-theme-dark as the dark mode class', () => {
        const tokens = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf8');

        expect(tokens).toContain('.nlx-editor-theme-dark');
        expect(tokens).not.toContain('.ck-theme-dark');
    });

    it('defines user palette tokens for dark mode color adaptation', () => {
        const tokens = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf8');

        expect(tokens).toContain('--nlx-palette-text-slate');
        expect(tokens).toContain('--nlx-palette-bg-red');
    });
});
