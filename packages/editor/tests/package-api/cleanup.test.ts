import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import * as rootEntry from '../../src';
import * as coreEntry from '../../src/core';
import * as uiEntry from '../../src/ui';

const editorRoot = join(__dirname, '..', '..', 'src');

describe('editor package cleanup', () => {
    it('does not expose old business presets or legacy helpers from the root entry', () => {
        const rootKeys = Object.keys(rootEntry);

        expect(rootKeys).not.toEqual(
            expect.arrayContaining([
                'BlogArticleEditor',
                'ArticleEditor',
                'CommentEditor',
                'SnippetEditor',
                'mergeEditorConfig',
                'buildEditorExtensions',
                'validateUploadFiles',
                'validateUploadedAsset',
                'EditorMessagesOverride',
            ]),
        );
    });

    it('keeps upload and concrete codeless integrations out of the editor package boundary', () => {
        expect(packageJson.exports).not.toHaveProperty('./upload');
        expect(packageJson.publishConfig).toEqual({ access: 'public' });
        expect(packageJson.dependencies).not.toHaveProperty(
            '@tiptap-codeless/extension-code-block-pro',
        );
        expect(packageJson.dependencies).not.toHaveProperty(
            '@tiptap-codeless/extension-drag-handle',
        );
        expect(packageJson.dependencies).not.toHaveProperty(
            '@tiptap-codeless/extension-file-upload',
        );
        expect(existsSync(join(editorRoot, 'upload'))).toBe(false);
        expect(existsSync(join(editorRoot, 'security/uploadPolicy.ts'))).toBe(false);
    });

    it('does not expose first-party message override APIs in v1', () => {
        expect(Object.keys(rootEntry)).not.toEqual(
            expect.arrayContaining(['editorMessages', 'resolveEditorMessages']),
        );
    });

    it('keeps core entry free of default UI exports', () => {
        expect(Object.keys(coreEntry)).not.toEqual(
            expect.arrayContaining(['DefaultToolbar', 'MenuButton']),
        );
    });

    it('does not ship a built-in slash command menu from the generic editor package', () => {
        expect(Object.keys(uiEntry)).not.toContain('SlashMenu');
        expect(existsSync(join(editorRoot, 'ui/SlashMenu.tsx'))).toBe(false);
    });

    it('removes old implementation files from the source tree', () => {
        [
            'Editor.tsx',
            'types.ts',
            'style.module.css',
            'core/EditorRoot.tsx',
            'core/buildEditorExtensions.ts',
            'presets',
            'ui/EditorBubbleMenu.tsx',
            'ui/menus',
        ].forEach((relativePath) => {
            expect(existsSync(join(editorRoot, relativePath))).toBe(false);
        });
    });
});
