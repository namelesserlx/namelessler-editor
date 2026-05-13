import type { Extensions, JSONContent } from '@tiptap/core';
import type { CreateEditorExtensionsOptions } from '../core/createEditorExtensions';
import type { EditorContentWarning } from '../core/documentModel';
import type { EditorFormat, EditorValue } from '../core/types';
import type { EditorAttributeSanitizers } from '../core/documentModel';
import type { IframeExtensionOptions } from '../core/iframe';
import type { HtmlPolicy } from '../security/types';

export type FormatWarning = EditorContentWarning;
export type UnsupportedContentStrategy = 'placeholder' | 'drop' | 'fail';

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

export interface FormatExportOptions extends FormatConversionOptions {
    unsupported?: UnsupportedContentStrategy;
}

export interface ExportContentOptions<
    Format extends EditorFormat = EditorFormat,
> extends FormatExportOptions {
    outputFormat: Format;
}

export type ImportContentValue<Format extends EditorFormat> = EditorValue<Format>;
export type ExportContentValue<Format extends EditorFormat> = Format extends 'json'
    ? JSONContent
    : string;
