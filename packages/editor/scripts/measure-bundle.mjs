import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

const ENTRY_BUDGETS = {
    'index.js': 8 * 1024,
    'react/index.js': 3 * 1024,
    'readonly/index.js': 2 * 1024,
    'format/index.js': 8 * 1024,
    'ui/index.js': 18 * 1024,
    'style.css': 8 * 1024,
};

const TOTAL_JS_GZIP_BUDGET = 56 * 1024;

function formatBytes(bytes) {
    return `${(bytes / 1024).toFixed(2)} kB`;
}

function readDistFile(relativePath) {
    const filePath = join(dist, relativePath);
    if (!existsSync(filePath)) {
        throw new Error(`Missing dist file: ${relativePath}`);
    }

    return readFileSync(filePath);
}

function gzipSize(relativePath) {
    return gzipSync(readDistFile(relativePath)).length;
}

function listFiles(dir, prefix = '') {
    return readdirSync(dir).flatMap((entry) => {
        const absolutePath = join(dir, entry);
        const relativePath = prefix ? `${prefix}/${entry}` : entry;
        if (statSync(absolutePath).isDirectory()) {
            return listFiles(absolutePath, relativePath);
        }

        return [relativePath];
    });
}

function collectLocalImportGraph(entry, visited = new Set()) {
    const normalizedEntry = normalize(entry).replaceAll('\\', '/');
    if (visited.has(normalizedEntry)) {
        return visited;
    }

    visited.add(normalizedEntry);
    const source = readDistFile(normalizedEntry).toString('utf8');
    const currentDir = dirname(normalizedEntry);
    const importPattern = /from\s+["']([^"']+)["']|import\(["']([^"']+)["']\)/g;

    for (const match of source.matchAll(importPattern)) {
        const specifier = match[1] ?? match[2];
        if (!specifier?.startsWith('.')) {
            continue;
        }

        const next = normalize(join(currentDir, specifier)).replaceAll('\\', '/');
        collectLocalImportGraph(next, visited);
    }

    return visited;
}

const failures = [];
const rows = Object.entries(ENTRY_BUDGETS).map(([entry, budget]) => {
    const size = gzipSize(entry);
    if (size > budget) {
        failures.push(`${entry} gzip ${formatBytes(size)} exceeds ${formatBytes(budget)}`);
    }

    return { entry, size, budget };
});

const jsFiles = listFiles(dist).filter((file) => file.endsWith('.js'));
const totalJsGzip = jsFiles.reduce((total, file) => total + gzipSize(file), 0);
if (totalJsGzip > TOTAL_JS_GZIP_BUDGET) {
    failures.push(
        `total JS gzip ${formatBytes(totalJsGzip)} exceeds ${formatBytes(TOTAL_JS_GZIP_BUDGET)}`,
    );
}

const readonlyGraph = [...collectLocalImportGraph('readonly/index.js')];
const readonlySource = readonlyGraph.map((file) => readDistFile(file).toString('utf8')).join('\n');

for (const forbidden of ['@tiptap/react', 'lucide-react', 'DefaultToolbar', 'SlashMenu']) {
    if (readonlySource.includes(forbidden)) {
        failures.push(`/readonly import graph contains editing UI dependency: ${forbidden}`);
    }
}

console.table(
    rows.map(({ entry, size, budget }) => ({
        entry,
        gzip: formatBytes(size),
        budget: formatBytes(budget),
    })),
);
console.log(`total JS gzip: ${formatBytes(totalJsGzip)} / ${formatBytes(TOTAL_JS_GZIP_BUDGET)}`);
console.log(`readonly graph: ${readonlyGraph.join(', ')}`);

if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join('\n'));
    process.exit(1);
}
