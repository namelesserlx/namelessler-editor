import type { JSONContent } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { normalizeEditorJson } from '../core/documentModel';
import type { FormatConversionOptions, FormatResult, FormatWarning } from './types';
import { createFormatExtensions } from './extensions';
import {
    getIframeOptions,
    getMarkdownSchemaSupport,
    getNormalizeOptions,
    type MarkdownSchemaSupport,
} from './schema';

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

function createMarkdownManager(
    options?: FormatConversionOptions,
    extensions = createFormatExtensions(options),
): MarkdownManager {
    return new MarkdownManager({
        extensions,
        markedOptions: {
            gfm: true,
        },
    });
}

function scanUnsupportedNodes(
    node: JSONContent,
    support: MarkdownSchemaSupport,
    path: Array<string | number> = [],
): FormatWarning[] {
    const warnings: FormatWarning[] = [];

    if (node.type && !support.nodes.has(node.type)) {
        warnings.push({
            code: 'UNSUPPORTED_NODE',
            message: `Node "${node.type}" cannot be exported to markdown.`,
            path,
        });
    }

    node.marks?.forEach((mark, index) => {
        if (!support.marks.has(mark.type)) {
            warnings.push({
                code: 'UNSUPPORTED_MARK',
                message: `Mark "${mark.type}" cannot be exported to markdown.`,
                path: [...path, 'marks', index],
            });
        }
    });

    node.content?.forEach((child, index) => {
        warnings.push(...scanUnsupportedNodes(child, support, [...path, 'content', index]));
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
    const value = normalizeEditorJson(
        manager.parse(stripRawHtml(markdown)),
        getNormalizeOptions(extensions, {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );

    return {
        value,
        warnings: [],
        stats: {
            durationMs: now() - startedAt,
            lossy: false,
        },
    };
}

export function exportMarkdown(
    doc: JSONContent,
    options?: FormatConversionOptions,
): FormatResult<string> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const support = getMarkdownSchemaSupport(
        MARKDOWN_SUPPORTED_NODES,
        MARKDOWN_SUPPORTED_MARKS,
        extensions,
    );
    const warnings = scanUnsupportedNodes(doc, support);

    if (warnings.length > 0) {
        return {
            value: '',
            warnings,
            stats: {
                durationMs: now() - startedAt,
                lossy: true,
            },
        };
    }

    const manager = createMarkdownManager(options, extensions);

    return {
        value: manager.serialize(
            normalizeEditorJson(
                doc,
                getNormalizeOptions(extensions, {
                    iframe: getIframeOptions(options),
                    attributeSanitizers: options?.attributeSanitizers,
                }),
            ),
        ),
        warnings: [],
        stats: {
            durationMs: now() - startedAt,
            lossy: false,
        },
    };
}
