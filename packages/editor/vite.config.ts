import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const packageJson = require('./package.json') as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
};

const externalPackages = new Set<string>([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
]);

const entries = {
    index: resolve(__dirname, 'src/index.ts'),
    'core/index': resolve(__dirname, 'src/core/index.ts'),
    'format/index': resolve(__dirname, 'src/format/index.ts'),
    'i18n/index': resolve(__dirname, 'src/i18n/index.ts'),
    'react/index': resolve(__dirname, 'src/react/index.ts'),
    'readonly/index': resolve(__dirname, 'src/readonly/index.ts'),
    'security/index': resolve(__dirname, 'src/security/index.ts'),
    'ui/index': resolve(__dirname, 'src/ui/index.ts'),
};

function isExternal(id: string): boolean {
    return [...externalPackages].some(
        (packageName) => id === packageName || id.startsWith(`${packageName}/`),
    );
}

export default defineConfig({
    build: {
        target: 'es2019',
        sourcemap: false,
        minify: 'esbuild',
        emptyOutDir: true,
        lib: {
            entry: entries,
            formats: ['es'],
            fileName: (_format, entryName) => `${entryName}.js`,
            cssFileName: 'style',
        },
        cssCodeSplit: false,
        rollupOptions: {
            // Keep runtime deps external so consumers control versions and avoid duplicate bundles.
            external: isExternal,
            output: {
                exports: 'named',
            },
        },
    },
});
