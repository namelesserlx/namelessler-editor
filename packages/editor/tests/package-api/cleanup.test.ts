import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import * as rootEntry from '../../src';
import * as coreEntry from '../../src/core';
import * as coreExtensionsEntry from '../../src/core/extensions';
import * as coreModelEntry from '../../src/core/model';
import * as reactControllerEntry from '../../src/react/controller';
import * as reactEditorEntry from '../../src/react/editor';
import * as uiEntry from '../../src/ui';

const editorRoot = join(__dirname, '..', '..', 'src');
const tiptapPeerRange = '>=3.22.5 <4';
const sourceExtensions = new Set(['.ts', '.tsx']);
const publicExportPaths = [
    '.',
    './core',
    './core/extensions',
    './core/model',
    './format',
    './i18n',
    './react',
    './react/controller',
    './react/editor',
    './readonly',
    './security',
    './style.css',
    './ui',
];

function listSourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((entry) => {
        const path = join(directory, entry);
        const stats = statSync(path);

        if (stats.isDirectory()) {
            return listSourceFiles(path);
        }

        return sourceExtensions.has(extname(path)) ? [path] : [];
    });
}

function toPackageName(specifier: string): string {
    const [scope, name] = specifier.split('/');

    return `${scope}/${name}`;
}

function findTiptapRuntimePackages(): string[] {
    const packageNames = new Set<string>();

    listSourceFiles(editorRoot).forEach((path) => {
        const source = readFileSync(path, 'utf8');
        const specifierPattern = /['"](@tiptap\/[^'"]+)['"]/g;

        for (const match of source.matchAll(specifierPattern)) {
            packageNames.add(toPackageName(match[1]));
        }
    });

    return [...packageNames].sort();
}

const tiptapRuntimePackages = findTiptapRuntimePackages();

describe('editor package cleanup', () => {
    it('publishes only documented public entry points', () => {
        expect(Object.keys(packageJson.exports).sort()).toEqual(publicExportPaths);
    });

    it('keeps the top-level entry free of React editor runtime exports', () => {
        expect(Object.keys(rootEntry)).not.toEqual(
            expect.arrayContaining([
                'Editor',
                'EditorRoot',
                'ReadonlyHtml',
                'ReadonlyRenderer',
                'renderReadonlyHtml',
                'useEditorController',
            ]),
        );
    });

    it('provides focused React and core subpath entries', () => {
        expect(Object.keys(reactControllerEntry).sort()).toEqual(['useEditorController']);
        expect(Object.keys(reactEditorEntry).sort()).toEqual(['Editor', 'EditorRoot', 'default']);
        expect(Object.keys(coreModelEntry).sort()).toEqual([
            'createEmptyDocument',
            'createNormalizeOptions',
            'isEditorJson',
            'normalizeEditorJson',
            'normalizeEditorJsonWithReport',
        ]);
        expect(Object.keys(coreExtensionsEntry).sort()).toEqual([
            'IframeEmbed',
            'createEditorExtensions',
            'createLowlight',
            'createLowlightRegistry',
        ]);
    });

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

    it('keeps Tiptap runtime packages as peer dependencies to avoid duplicate editor instances', () => {
        expect(
            Object.keys(packageJson.dependencies).filter((name) => name.startsWith('@tiptap/')),
        ).toEqual([]);
        expect(tiptapRuntimePackages).not.toEqual([]);

        expect(
            Object.keys(packageJson.peerDependencies)
                .filter((name) => name.startsWith('@tiptap/'))
                .sort(),
        ).toEqual(tiptapRuntimePackages);

        tiptapRuntimePackages.forEach((packageName) => {
            expect(packageJson.peerDependencies).toHaveProperty(packageName);
            expect(packageJson.devDependencies).toHaveProperty(packageName);
            expect(packageJson.peerDependencies[packageName]).toBe(tiptapPeerRange);
            expect(packageJson.devDependencies[packageName]).toMatch(/^\d+\.\d+\.\d+$/);
        });
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

    it('keeps UI components organized under feature folders', () => {
        const rootUiFiles = readdirSync(join(editorRoot, 'ui'));

        expect(rootUiFiles.filter((fileName) => fileName.endsWith('.tsx'))).toEqual([]);
        expect(rootUiFiles).toEqual(
            expect.arrayContaining([
                'components',
                'popovers',
                'toolbar',
                'menus',
                'hooks',
                'color',
                'shell',
            ]),
        );
    });

    it('removes old implementation files from the source tree', () => {
        [
            'Editor.tsx',
            'types.ts',
            'style.module.css',
            'core/EditorRoot.tsx',
            'core/buildEditorExtensions.ts',
            'presets',
            'react/Editor.tsx',
            'ui/EditorBubbleMenu.tsx',
        ].forEach((relativePath) => {
            expect(existsSync(join(editorRoot, relativePath))).toBe(false);
        });
    });
});
