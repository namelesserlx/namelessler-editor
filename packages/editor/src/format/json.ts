import type { JSONContent } from '@tiptap/core';
import { normalizeEditorJson } from '../core/documentModel';
import type { FormatConversionOptions, FormatResult } from './types';
import { createFormatExtensions } from './extensions';
import { getIframeOptions, getNormalizeOptions } from './schema';

function now(): number {
    return performance.now();
}

export function importJson(
    value: unknown,
    options?: FormatConversionOptions,
): FormatResult<JSONContent> {
    const startedAt = now();

    return {
        value: normalizeEditorJson(
            value,
            getNormalizeOptions(createFormatExtensions(options), {
                iframe: getIframeOptions(options),
                attributeSanitizers: options?.attributeSanitizers,
            }),
        ),
        warnings: [],
        stats: {
            durationMs: now() - startedAt,
            lossy: false,
        },
    };
}

export function exportJson(
    doc: JSONContent,
    options?: FormatConversionOptions,
): FormatResult<JSONContent> {
    return importJson(doc, options);
}
