import type { JSONContent } from '@tiptap/core';
import { generateHTML, generateJSON } from '@tiptap/html';
import { normalizeEditorJsonWithReport } from '../core/documentModel';
import { sanitizeHtmlWithReport } from '../security/htmlPolicy';
import type { FormatConversionOptions, FormatExportOptions, FormatResult } from './types';
import { createFormatExtensions } from './extensions';
import { getHtmlSchemaSupport, getIframeOptions, getNormalizeOptions } from './schema';
import { applyUnsupportedContentStrategy } from './unsupported';

function now(): number {
    return performance.now();
}

export function importHtml(
    html: string,
    options?: FormatConversionOptions,
): FormatResult<JSONContent> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const sanitized = sanitizeHtmlWithReport(html, options?.htmlPolicy);
    const normalized = normalizeEditorJsonWithReport(
        generateJSON(sanitized.value, extensions),
        getNormalizeOptions(extensions, {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );
    const warnings = [...sanitized.warnings, ...normalized.warnings];

    return {
        value: normalized.value,
        warnings,
        stats: {
            durationMs: now() - startedAt,
            lossy: warnings.length > 0,
        },
    };
}

export function exportHtml(doc: JSONContent, options?: FormatExportOptions): FormatResult<string> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const unsupported = applyUnsupportedContentStrategy(
        doc,
        getHtmlSchemaSupport(extensions),
        'HTML',
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

    const normalized = normalizeEditorJsonWithReport(
        unsupported.value,
        getNormalizeOptions(extensions, {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );
    const html = generateHTML(normalized.value, extensions);
    const sanitized = sanitizeHtmlWithReport(html, options?.htmlPolicy);
    const warnings = [...unsupported.warnings, ...normalized.warnings, ...sanitized.warnings];

    return {
        value: sanitized.value,
        warnings,
        stats: {
            durationMs: now() - startedAt,
            lossy: warnings.length > 0,
        },
    };
}
