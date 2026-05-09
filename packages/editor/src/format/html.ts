import type { JSONContent } from '@tiptap/core';
import { generateHTML, generateJSON } from '@tiptap/html';
import { normalizeEditorJson } from '../core/documentModel';
import { sanitizeHtml } from '../security/htmlPolicy';
import type { FormatConversionOptions, FormatResult } from './types';
import { createFormatExtensions } from './extensions';
import { getIframeOptions, getNormalizeOptions } from './schema';

function now(): number {
    return performance.now();
}

export function importHtml(
    html: string,
    options?: FormatConversionOptions,
): FormatResult<JSONContent> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const safeHtml = sanitizeHtml(html, options?.htmlPolicy);
    const value = normalizeEditorJson(
        generateJSON(safeHtml, extensions),
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

export function exportHtml(
    doc: JSONContent,
    options?: FormatConversionOptions,
): FormatResult<string> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const normalized = normalizeEditorJson(
        doc,
        getNormalizeOptions(extensions, {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );
    const html = generateHTML(normalized, extensions);

    return {
        value: sanitizeHtml(html, options?.htmlPolicy),
        warnings: [],
        stats: {
            durationMs: now() - startedAt,
            lossy: false,
        },
    };
}
