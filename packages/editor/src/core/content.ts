import type { JSONContent } from '@tiptap/core';
import { createFormatExtensions } from '../format/extensions';
import { exportContent, importContent } from '../format';
import { getIframeOptions, getNormalizeOptions } from '../format/schema';
import type {
    ExportContentOptions,
    FormatConversionOptions,
    FormatResult,
    ImportContentOptions,
} from '../format/types';
import type { EditorFormat, EditorValue } from './types';
import { createEmptyDocument, normalizeEditorJson } from './documentModel';

export type NormalizeEditorContentOptions = FormatConversionOptions;

export interface ImportEditorContentOptions<
    Format extends EditorFormat = EditorFormat,
> extends FormatConversionOptions {
    from: Format;
}

export interface ExportEditorContentOptions<
    Format extends EditorFormat = EditorFormat,
> extends FormatConversionOptions {
    to: Format;
}

export function normalizeEditorContent(
    value: unknown,
    options?: NormalizeEditorContentOptions,
): JSONContent {
    const extensions = createFormatExtensions(options);

    return normalizeEditorJson(
        value,
        getNormalizeOptions(extensions, {
            iframe: getIframeOptions(options),
            attributeSanitizers: options?.attributeSanitizers,
        }),
    );
}

export function importEditorContent<Format extends EditorFormat>(
    value: EditorValue<Format>,
    options: ImportEditorContentOptions<Format>,
): FormatResult<JSONContent> {
    const { from, ...rest } = options;

    return importContent(value, {
        ...rest,
        inputFormat: from,
    } as ImportContentOptions<Format>);
}

export function exportEditorContent<Format extends EditorFormat>(
    doc: JSONContent,
    options: ExportEditorContentOptions<Format>,
): FormatResult<EditorValue<Format>> {
    const { to, ...rest } = options;

    return exportContent(doc, {
        ...rest,
        outputFormat: to,
    } as ExportContentOptions<Format>);
}

function getNodeContent(node: JSONContent): JSONContent[] {
    return Array.isArray(node.content) ? node.content : [];
}

export function getEditorContentText(
    content: JSONContent,
    options?: NormalizeEditorContentOptions,
) {
    const normalized = normalizeEditorContent(content, options);

    function getNodeText(node: JSONContent): string {
        if (typeof node.text === 'string') {
            return node.text;
        }

        return getNodeContent(node).map(getNodeText).filter(Boolean).join(' ');
    }

    return getNodeText(normalized).replace(/\s+/g, ' ').trim();
}

export function isEditorContentEmpty(
    content: JSONContent,
    options?: NormalizeEditorContentOptions,
): boolean {
    return getEditorContentText(content, options).length === 0;
}

export function createEmptyEditorContent(): JSONContent {
    return createEmptyDocument();
}
