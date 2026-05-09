import type { JSONContent } from '@tiptap/core';
import type { EditorFormat, EditorValue } from '../core/types';
import { exportHtml, importHtml } from './html';
import { exportJson, importJson } from './json';
import { exportMarkdown, importMarkdown } from './markdown';
import type { ExportContentOptions, FormatResult, ImportContentOptions } from './types';

export function importContent<Format extends EditorFormat>(
    value: EditorValue<Format>,
    options: ImportContentOptions<Format>,
): FormatResult<JSONContent> {
    if (options.inputFormat === 'json') {
        return importJson(value, options);
    }

    if (options.inputFormat === 'html') {
        return importHtml(value as string, options);
    }

    return importMarkdown(value as string, options);
}

export function exportContent<Format extends EditorFormat>(
    doc: JSONContent,
    options: ExportContentOptions<Format>,
): FormatResult<EditorValue<Format>> {
    if (options.outputFormat === 'json') {
        return exportJson(doc, options) as FormatResult<EditorValue<Format>>;
    }

    if (options.outputFormat === 'html') {
        return exportHtml(doc, options) as FormatResult<EditorValue<Format>>;
    }

    return exportMarkdown(doc, options) as FormatResult<EditorValue<Format>>;
}

export { exportHtml, importHtml } from './html';
export { exportJson, importJson } from './json';
export { exportMarkdown, importMarkdown } from './markdown';
export type {
    ExportContentOptions,
    ExportContentValue,
    FormatConversionOptions,
    FormatResult,
    FormatWarning,
    ImportContentOptions,
    ImportContentValue,
} from './types';
