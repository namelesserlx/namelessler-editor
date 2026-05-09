import { describe, expect, it } from 'vitest';
import {
    DEFAULT_EDITOR_LOCALE,
    SUPPORTED_EDITOR_LOCALES,
    editorMessages,
    resolveEditorMessages,
} from '../../src/i18n';

describe('editor i18n messages', () => {
    it('defines the v1 built-in locales', () => {
        expect(DEFAULT_EDITOR_LOCALE).toBe('en-US');
        expect(SUPPORTED_EDITOR_LOCALES).toEqual(['en-US', 'zh-CN']);
    });

    it('resolves English and Simplified Chinese messages', () => {
        expect(resolveEditorMessages('en-US').toolbar.bold).toBe('Bold');
        expect(resolveEditorMessages('zh-CN').toolbar.bold).toBe('加粗');
    });

    it('returns built-in messages without exposing upload copy', () => {
        const resolved = resolveEditorMessages('en-US');

        expect(resolved.toolbar.bold).toBe('Bold');
        expect(resolved.toolbar.italic).toBe('Italic');
        expect(resolved.toolbar).not.toHaveProperty('upload');
        expect(resolved).not.toHaveProperty('upload');
        expect(resolved).not.toHaveProperty('slashMenu');
        expect(editorMessages['en-US'].toolbar.bold).toBe('Bold');
    });

    it('falls back to the default locale for unknown runtime locale values', () => {
        expect(resolveEditorMessages('fr-FR' as 'en-US').toolbar.bold).toBe('Bold');
    });
});
