import { useMemo } from 'react';
import type { Extensions, JSONContent } from '@tiptap/core';
import type { CreateEditorExtensionsOptions } from '../core/createEditorExtensions';
import type { EditorAttributeSanitizers } from '../core/documentModel';
import { exportEditorContent, importEditorContent } from '../core';
import type { EditorFormat, EditorValue } from '../core/types';
import type { FormatResult, FormatWarning } from '../format';
import type { HtmlPolicy } from '../security/types';

export interface RenderReadonlyHtmlOptions<Format extends EditorFormat = 'json'> {
    contentFormat?: Format;
    extensions?: Extensions;
    editorOptions?: CreateEditorExtensionsOptions;
    attributeSanitizers?: EditorAttributeSanitizers;
    htmlPolicy?: HtmlPolicy;
}

export interface ReadonlyHtmlProps {
    html: string;
    className?: string;
}

export interface ReadonlyRendererProps<
    Format extends EditorFormat = 'json',
> extends RenderReadonlyHtmlOptions<Format> {
    content: EditorValue<Format>;
    className?: string;
}

function mergeWarnings(
    importWarnings: FormatWarning[],
    exportWarnings: FormatWarning[],
): FormatWarning[] {
    return importWarnings.length === 0 ? exportWarnings : [...importWarnings, ...exportWarnings];
}

export function renderReadonlyHtml<Format extends EditorFormat = 'json'>(
    content: EditorValue<Format>,
    options: RenderReadonlyHtmlOptions<Format> = {},
): FormatResult<string> {
    const { contentFormat = 'json' as Format, ...conversionOptions } = options;
    if (contentFormat === 'json') {
        return exportEditorContent(content as JSONContent, {
            to: 'html',
            ...conversionOptions,
        });
    }

    const imported = importEditorContent(content, {
        from: contentFormat,
        ...conversionOptions,
    });
    const exported = exportEditorContent(imported.value, {
        to: 'html',
        ...conversionOptions,
    });

    return {
        value: exported.value,
        warnings: mergeWarnings(imported.warnings, exported.warnings),
        stats: {
            durationMs: imported.stats.durationMs + exported.stats.durationMs,
            lossy: imported.stats.lossy || exported.stats.lossy,
        },
    };
}

export function ReadonlyHtml({ html, className }: ReadonlyHtmlProps) {
    return (
        <div
            className={className}
            data-nameless-editor-readonly="true"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

export function ReadonlyRenderer<Format extends EditorFormat = 'json'>({
    content,
    contentFormat,
    extensions,
    editorOptions,
    attributeSanitizers,
    htmlPolicy,
    className,
}: ReadonlyRendererProps<Format>) {
    const html = useMemo(
        () =>
            renderReadonlyHtml(content, {
                contentFormat,
                extensions,
                editorOptions,
                attributeSanitizers,
                htmlPolicy,
            }).value,
        [attributeSanitizers, content, contentFormat, editorOptions, extensions, htmlPolicy],
    );

    return <ReadonlyHtml html={html} className={className} />;
}
