import { useEffect, useState } from 'react';
import type { Extensions } from '@tiptap/core';
import type { CreateEditorExtensionsOptions } from '../core/createEditorExtensions';
import type { EditorAttributeSanitizers } from '../core/documentModel';
import { exportEditorContent, importEditorContent } from '../core';
import type { EditorFormat, EditorValue } from '../core/types';
import type { EditorLocale } from '../i18n';
import type { HtmlPolicy } from '../security/types';

export interface ReadonlyRendererProps<Format extends EditorFormat = 'json'> {
    content: EditorValue<Format>;
    contentFormat?: Format;
    extensions?: Extensions;
    editorOptions?: CreateEditorExtensionsOptions;
    attributeSanitizers?: EditorAttributeSanitizers;
    htmlPolicy?: HtmlPolicy;
    locale?: EditorLocale;
    className?: string;
}

export function ReadonlyRenderer<Format extends EditorFormat = 'json'>({
    content,
    contentFormat = 'json' as Format,
    extensions,
    editorOptions,
    attributeSanitizers,
    htmlPolicy,
    className,
}: ReadonlyRendererProps<Format>) {
    const [html, setHtml] = useState('');

    useEffect(() => {
        const imported = importEditorContent(content, {
            from: contentFormat,
            extensions,
            editorOptions,
            attributeSanitizers,
            htmlPolicy,
        });

        const result = exportEditorContent(imported.value, {
            to: 'html',
            extensions,
            editorOptions,
            attributeSanitizers,
            htmlPolicy,
        });

        setHtml(result.value);
    }, [attributeSanitizers, content, contentFormat, editorOptions, extensions, htmlPolicy]);

    if (!html) {
        return null;
    }

    return (
        <div
            className={className}
            data-nameless-editor-readonly="true"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
