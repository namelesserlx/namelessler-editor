import type React from 'react';
import type { Extensions, JSONContent } from '@tiptap/core';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorFormat, EditorValue } from '../core/types';
import type { CreateEditorExtensionsOptions } from '../core/createEditorExtensions';
import type { EditorAttributeSanitizers } from '../core/documentModel';
import type { EditorLocale } from '../i18n';
import type { HtmlPolicy } from '../security/types';
import type { EditorUiConfig } from '../ui/types';

export interface EditorUpdateMeta {
    isDirty: boolean;
    isEmpty: boolean;
}

export interface EditorController {
    editor: TiptapEditor | null;
    locale?: EditorLocale;
    readonly?: boolean;
    editorOptions?: CreateEditorExtensionsOptions;
    isReady: boolean;
    isDirty: boolean;
    isEmpty: boolean;
    focus: () => void;
    blur: () => void;
    clear: () => void;
    markClean: () => void;
    setContent: <Format extends EditorFormat = 'json'>(
        value: EditorValue<Format>,
        options?: {
            format?: Format;
            emitUpdate?: boolean;
        },
    ) => void;
    getJSON: () => JSONContent;
    getText: () => string;
    getHTML: () => string;
    getMarkdown: () => string;
    exportTo: {
        (format: 'json'): JSONContent;
        (format: 'html'): string;
        (format: 'markdown'): string;
    };
}

export interface UseEditorControllerOptions {
    defaultContent?: EditorValue;
    contentFormat?: EditorFormat;
    readonly?: boolean;
    autofocus?: boolean;
    placeholder?: string;
    contentClassName?: string;
    locale?: EditorLocale;
    extensions?: Extensions;
    editorOptions?: CreateEditorExtensionsOptions;
    attributeSanitizers?: EditorAttributeSanitizers;
    htmlPolicy?: HtmlPolicy;
    onReady?: (editor: TiptapEditor) => void;
    onFocus?: (editor: TiptapEditor) => void;
    onBlur?: (editor: TiptapEditor) => void;
    onUpdate?: (meta: EditorUpdateMeta) => void;
}

export interface EditorProps extends Omit<UseEditorControllerOptions, 'onUpdate'> {
    controller?: EditorController;
    className?: string;
    style?: React.CSSProperties;
    ui?: EditorUiConfig;
    onUpdate?: (meta: EditorUpdateMeta) => void;
}

export type AnyEditorProps = EditorProps;
