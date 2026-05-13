import type { JSONContent } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { Lexer, Marked, marked, type MarkedOptions } from 'marked';
import { normalizeEditorJsonWithReport } from '../core/documentModel';
import type {
    FormatConversionOptions,
    FormatExportOptions,
    FormatResult,
    FormatWarning,
} from './types';
import { createFormatExtensions } from './extensions';
import {
    getEditorSchemaSupport,
    getIframeOptions,
    getMarkdownSchemaSupport,
    getNormalizeOptions,
    intersectSchemaSupport,
    type MarkdownSchemaSupport,
} from './schema';
import { applyUnsupportedContentStrategy } from './unsupported';

const MARKDOWN_SUPPORTED_NODES = new Set([
    'doc',
    'paragraph',
    'text',
    'heading',
    'blockquote',
    'bulletList',
    'orderedList',
    'listItem',
    'taskList',
    'taskItem',
    'codeBlock',
    'hardBreak',
    'horizontalRule',
    'table',
    'tableRow',
    'tableHeader',
    'tableCell',
]);

const MARKDOWN_SUPPORTED_MARKS = new Set(['bold', 'italic', 'strike', 'code', 'link']);

const RAW_HTML_PATTERN = /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<\/?[a-z][^>]*>/giu;
const FENCE_START_PATTERN = /^ {0,3}(`{3,}|~{3,})/;

type MarkedInstance = typeof marked;
type StringMarkedOptions = MarkedOptions<string, string>;

function now(): number {
    return performance.now();
}

function stripRawHtmlOutsideInlineCode(line: string): string {
    let result = '';
    let index = 0;
    const codeSpanPattern = /(`+)([^`]*?)\1/g;

    for (const match of line.matchAll(codeSpanPattern)) {
        result += line.slice(index, match.index).replace(RAW_HTML_PATTERN, '');
        result += match[0];
        index = match.index + match[0].length;
    }

    return result + line.slice(index).replace(RAW_HTML_PATTERN, '');
}

function stripRawHtml(markdown: string): string {
    const lines = markdown.split('\n');
    let activeFence: string | null = null;

    return lines
        .map((line) => {
            const fenceMatch = line.match(FENCE_START_PATTERN);
            if (fenceMatch) {
                const marker = fenceMatch[1][0];
                if (!activeFence) {
                    activeFence = marker;
                    return line;
                }

                if (activeFence === marker) {
                    activeFence = null;
                    return line;
                }
            }

            return activeFence ? line : stripRawHtmlOutsideInlineCode(line);
        })
        .join('\n');
}

function stripRawHtmlWithReport(markdown: string): { value: string; warnings: FormatWarning[] } {
    const value = stripRawHtml(markdown);

    return {
        value,
        warnings:
            value === markdown
                ? []
                : [
                      {
                          code: 'SANITIZED_HTML',
                          message: 'Raw HTML was stripped from markdown before conversion.',
                          path: [],
                      },
                  ],
    };
}

// MarkdownManager registers tokenizers on the provided marked object and later creates
// `new marked.Lexer()`, so expose an isolated marked-shaped facade whose Lexer sees
// per-manager defaults without mutating marked's global singleton.
function createIsolatedMarked(): MarkedInstance {
    const instance = new Marked<string, string>();
    const isolated = Object.assign(
        ((source: string, options?: Parameters<typeof marked>[1]) =>
            instance.parse(source, options as StringMarkedOptions | undefined)) as MarkedInstance,
        marked,
    );

    const syncDefaults = (): MarkedInstance => {
        isolated.defaults = instance.defaults;
        return isolated;
    };

    class IsolatedLexer extends Lexer {
        constructor(options?: StringMarkedOptions) {
            super(options ?? instance.defaults);
        }
    }

    isolated.options = ((options) => {
        instance.options(options);
        return syncDefaults();
    }) as MarkedInstance['options'];
    isolated.setOptions = ((options) => {
        instance.setOptions(options);
        return syncDefaults();
    }) as MarkedInstance['setOptions'];
    isolated.use = ((...extensions) => {
        instance.use(...extensions);
        return syncDefaults();
    }) as MarkedInstance['use'];
    isolated.walkTokens = ((tokens, callback) =>
        instance.walkTokens(tokens, callback)) as MarkedInstance['walkTokens'];
    isolated.parseInline = ((source, options) =>
        instance.parseInline(
            source,
            options as StringMarkedOptions | undefined,
        )) as MarkedInstance['parseInline'];
    isolated.parse = isolated;
    isolated.parser = ((tokens, options) =>
        instance.parser(
            tokens,
            options as StringMarkedOptions | undefined,
        )) as MarkedInstance['parser'];
    isolated.lexer = ((source, options) =>
        instance.lexer(
            source,
            options as StringMarkedOptions | undefined,
        )) as MarkedInstance['lexer'];
    isolated.Lexer = IsolatedLexer as MarkedInstance['Lexer'];

    return syncDefaults();
}

function createMarkdownManager(
    options?: FormatConversionOptions,
    extensions = createFormatExtensions(options),
): MarkdownManager {
    return new MarkdownManager({
        marked: createIsolatedMarked(),
        extensions,
        markedOptions: {
            gfm: true,
        },
    });
}

function getMarkdownNodeAttributeKeys(node: JSONContent): Set<string> {
    if (node.type === 'heading') {
        return new Set(['level']);
    }

    if (node.type === 'codeBlock') {
        return new Set(['language', 'defaultLanguage']);
    }

    if (node.type === 'orderedList') {
        return new Set(['start']);
    }

    if (node.type === 'taskItem') {
        return new Set(['checked']);
    }

    return new Set();
}

function getMarkdownMarkAttributeKeys(
    mark: NonNullable<JSONContent['marks']>[number],
): Set<string> {
    if (mark.type === 'link') {
        return new Set(['href', 'title']);
    }

    return new Set();
}

function hasLossyAttributes(attrs: JSONContent['attrs'], allowedKeys: Set<string>): boolean {
    if (!attrs) {
        return false;
    }

    return Object.keys(attrs).some((key) => !allowedKeys.has(key));
}

function scanMarkdownLosses(
    node: JSONContent,
    support: MarkdownSchemaSupport,
    path: Array<string | number> = [],
): FormatWarning[] {
    const warnings: FormatWarning[] = [];
    const customMarkdownNode =
        node.type && !MARKDOWN_SUPPORTED_NODES.has(node.type) && support.nodes.has(node.type);

    if (
        node.type &&
        !customMarkdownNode &&
        hasLossyAttributes(node.attrs, getMarkdownNodeAttributeKeys(node))
    ) {
        warnings.push({
            code: 'LOSSY_MARKDOWN_EXPORT',
            message: `Node "${node.type}" has attributes that cannot be exported to markdown.`,
            path: [...path, 'attrs'],
        });
    }

    node.marks?.forEach((mark, index) => {
        const customMarkdownMark =
            !MARKDOWN_SUPPORTED_MARKS.has(mark.type) && support.marks.has(mark.type);

        if (
            !customMarkdownMark &&
            hasLossyAttributes(mark.attrs, getMarkdownMarkAttributeKeys(mark))
        ) {
            warnings.push({
                code: 'LOSSY_MARKDOWN_EXPORT',
                message: `Mark "${mark.type}" has attributes that cannot be exported to markdown.`,
                path: [...path, 'marks', index, 'attrs'],
            });
        }
    });

    node.content?.forEach((child, index) => {
        warnings.push(...scanMarkdownLosses(child, support, [...path, 'content', index]));
    });

    return warnings;
}

export function importMarkdown(
    markdown: string,
    options?: FormatConversionOptions,
): FormatResult<JSONContent> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const manager = createMarkdownManager(options, extensions);
    const stripped = stripRawHtmlWithReport(markdown);
    const normalized = normalizeEditorJsonWithReport(
        manager.parse(stripped.value),
        getNormalizeOptions(extensions, {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );
    const warnings = [...stripped.warnings, ...normalized.warnings];

    return {
        value: normalized.value,
        warnings,
        stats: {
            durationMs: now() - startedAt,
            lossy: warnings.length > 0,
        },
    };
}

export function exportMarkdown(
    doc: JSONContent,
    options?: FormatExportOptions,
): FormatResult<string> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const schemaSupport = getEditorSchemaSupport(extensions);
    const markdownSupport = intersectSchemaSupport(
        schemaSupport,
        getMarkdownSchemaSupport(MARKDOWN_SUPPORTED_NODES, MARKDOWN_SUPPORTED_MARKS, extensions),
    );
    const unsupported = applyUnsupportedContentStrategy(
        doc,
        markdownSupport,
        'markdown',
        options?.unsupported ?? 'placeholder',
    );

    if (unsupported.failed) {
        return {
            value: '',
            warnings: unsupported.warnings,
            stats: {
                durationMs: now() - startedAt,
                lossy: true,
            },
        };
    }

    const manager = createMarkdownManager(options, extensions);
    const normalized = normalizeEditorJsonWithReport(
        unsupported.value,
        getNormalizeOptions(extensions, {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );
    const markdownWarnings = scanMarkdownLosses(normalized.value, markdownSupport);
    const allWarnings = [...unsupported.warnings, ...normalized.warnings, ...markdownWarnings];

    return {
        value: manager.serialize(normalized.value),
        warnings: allWarnings,
        stats: {
            durationMs: now() - startedAt,
            lossy: allWarnings.length > 0,
        },
    };
}
