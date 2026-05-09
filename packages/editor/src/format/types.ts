import type { Extensions, JSONContent } from '@tiptap/core';
import type { CreateEditorExtensionsOptions } from '../core/createEditorExtensions';
import type { EditorFormat, EditorValue } from '../core/types';
import type { EditorAttributeSanitizers } from '../core/documentModel';
import type { IframeExtensionOptions } from '../core/iframe';
import type { HtmlPolicy } from '../security/types';

export interface FormatWarning {
    code:
        | 'UNSUPPORTED_NODE'
        | 'UNSUPPORTED_MARK'
        | 'DROPPED_ATTRIBUTE'
        | 'SANITIZED_ATTRIBUTE'
        | 'LOSSY_MARKDOWN_EXPORT';
    message: string;
    path?: Array<string | number>;
}

export interface FormatResult<T> {
    value: T;
    warnings: FormatWarning[];
    stats: {
        durationMs: number;
        lossy: boolean;
    };
}

export interface FormatConversionOptions {
    extensions?: Extensions;
    editorOptions?: CreateEditorExtensionsOptions;
    htmlPolicy?: HtmlPolicy;
    iframe?: IframeExtensionOptions;
    attributeSanitizers?: EditorAttributeSanitizers;
}

export interface ImportContentOptions<
    Format extends EditorFormat = EditorFormat,
> extends FormatConversionOptions {
    inputFormat: Format;
}

export interface ExportContentOptions<
    Format extends EditorFormat = EditorFormat,
> extends FormatConversionOptions {
    outputFormat: Format;
}

export type ImportContentValue<Format extends EditorFormat> = EditorValue<Format>;
export type ExportContentValue<Format extends EditorFormat> = Format extends 'json'
    ? JSONContent
    : string;
