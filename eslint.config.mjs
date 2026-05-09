import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceFiles = ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}'];
const testFiles = ['**/*.{test,spec}.{ts,tsx}', '**/tests/**/*.{ts,tsx}'];
const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
    {
        ignores: [
            '**/dist/**',
            '**/coverage/**',
            '**/node_modules/**',
            '**/.turbo/**',
            '**/*.d.ts',
            'docs/superpowers/**',
        ],
    },
    {
        files: sourceFiles,
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir,
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [reactHooks.configs.flat.recommended],
        rules: {
            'react-hooks/refs': 'off',
            'react-hooks/set-state-in-effect': 'off',
        },
    },
    {
        files: ['apps/playground/**/*.{ts,tsx}'],
        extends: [reactRefresh.configs.vite],
    },
    {
        files: testFiles,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.vitest,
            },
        },
    },
]);
