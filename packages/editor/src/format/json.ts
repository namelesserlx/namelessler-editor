import type { JSONContent } from '@tiptap/core';
import { createEmptyDocument, normalizeEditorJsonWithReport } from '../core/documentModel';
import type { FormatConversionOptions, FormatExportOptions, FormatResult } from './types';
import { createFormatExtensions } from './extensions';
import { getEditorSchemaSupport, getIframeOptions, getNormalizeOptions } from './schema';
import { applyUnsupportedContentStrategy } from './unsupported';

function now(): number {
    return performance.now();
}

export function importJson(
    value: unknown,
    options?: FormatConversionOptions,
): FormatResult<JSONContent> {
    const startedAt = now();
    const normalized = normalizeEditorJsonWithReport(
        value,
        getNormalizeOptions(createFormatExtensions(options), {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );

    return {
        value: normalized.value,
        warnings: normalized.warnings,
        stats: {
            durationMs: now() - startedAt,
            lossy: normalized.lossy,
        },
    };
}

export function exportJson(
    doc: JSONContent,
    options?: FormatExportOptions,
): FormatResult<JSONContent> {
    const startedAt = now();
    const extensions = createFormatExtensions(options);
    const unsupported = applyUnsupportedContentStrategy(
        doc,
        getEditorSchemaSupport(extensions),
        'JSON',
        options?.unsupported ?? 'drop',
    );

    if (unsupported.failed) {
        return {
            value: createEmptyDocument(),
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
    const warnings = [...unsupported.warnings, ...normalized.warnings];

    return {
        value: normalized.value,
        warnings,
        stats: {
            durationMs: now() - startedAt,
            lossy: warnings.length > 0,
        },
    };
}
