import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useEditor } from '@tiptap/react';
import { createEditorExtensions } from '../core/createEditorExtensions';
import {
    createEmptyDocument,
    exportEditorContent,
    importEditorContent,
    normalizeEditorContent,
} from '../core';
import { sanitizeHtml } from '../security/htmlPolicy';
import type { EditorFormat, EditorValue } from '../core/types';
import type { EditorController, EditorUpdateMeta, UseEditorControllerOptions } from './types';

function resolveContentFormat(format: EditorFormat | undefined): EditorFormat {
    return format ?? 'json';
}

function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

export function useEditorController(options: UseEditorControllerOptions = {}): EditorController {
    const latestOptionsRef = useLatestRef(options);
    const initialContentRef = useRef<JSONContent | null>(null);
    const [meta, setMeta] = useState<EditorUpdateMeta>({
        isDirty: false,
        isEmpty: true,
    });

    const formatOptions = useMemo(
        () => ({
            extensions: options.extensions,
            editorOptions: options.editorOptions,
            attributeSanitizers: options.attributeSanitizers,
            htmlPolicy: options.htmlPolicy,
        }),
        [
            options.attributeSanitizers,
            options.editorOptions,
            options.extensions,
            options.htmlPolicy,
        ],
    );

    if (!initialContentRef.current) {
        initialContentRef.current = importEditorContent(
            (options.defaultContent ?? createEmptyDocument()) as EditorValue,
            {
                from: resolveContentFormat(options.contentFormat),
                ...formatOptions,
            },
        ).value;
    }

    const extensions = useMemo(
        () =>
            createEditorExtensions({
                ...options.editorOptions,
                placeholder: options.placeholder ?? options.editorOptions?.placeholder,
                extraExtensions: [
                    ...(options.editorOptions?.extraExtensions ?? []),
                    ...(options.extensions ?? []),
                ],
            }),
        [options.editorOptions, options.extensions, options.placeholder],
    );

    const editor = useEditor({
        extensions,
        content: initialContentRef.current,
        editable: !options.readonly,
        autofocus: options.autofocus,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                class: options.contentClassName ?? '',
                'data-nameless-editor-content': 'true',
            },
            transformPastedHTML: (html) => sanitizeHtml(html, latestOptionsRef.current.htmlPolicy),
        },
        onCreate: ({ editor: currentEditor }) => {
            const nextMeta = {
                isDirty: false,
                isEmpty: currentEditor.isEmpty,
            };
            setMeta(nextMeta);
            latestOptionsRef.current.onReady?.(currentEditor);
        },
        onFocus: ({ editor: currentEditor }) => {
            latestOptionsRef.current.onFocus?.(currentEditor);
        },
        onBlur: ({ editor: currentEditor }) => {
            latestOptionsRef.current.onBlur?.(currentEditor);
        },
    });

    useEffect(() => {
        if (!editor || editor.isDestroyed) {
            return;
        }

        const handleUpdate = () => {
            const nextMeta = {
                isDirty: true,
                isEmpty: editor.isEmpty,
            };
            setMeta((current) =>
                current.isDirty === nextMeta.isDirty && current.isEmpty === nextMeta.isEmpty
                    ? current
                    : nextMeta,
            );
            latestOptionsRef.current.onUpdate?.(nextMeta);
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, latestOptionsRef]);

    const getJson = useCallback(() => {
        const currentOptions = latestOptionsRef.current;
        const current = editor?.getJSON() ?? initialContentRef.current ?? createEmptyDocument();

        return normalizeEditorContent(current, {
            extensions: currentOptions.extensions,
            editorOptions: currentOptions.editorOptions,
            attributeSanitizers: currentOptions.attributeSanitizers,
            htmlPolicy: currentOptions.htmlPolicy,
        });
    }, [editor, latestOptionsRef]);

    const exportTo = useCallback(
        (format: EditorFormat) => {
            const currentOptions = latestOptionsRef.current;
            if (format === 'json') {
                return getJson();
            }

            return exportEditorContent(getJson(), {
                to: format,
                extensions: currentOptions.extensions,
                editorOptions: currentOptions.editorOptions,
                attributeSanitizers: currentOptions.attributeSanitizers,
                htmlPolicy: currentOptions.htmlPolicy,
            }).value;
        },
        [getJson, latestOptionsRef],
    ) as EditorController['exportTo'];

    return {
        editor,
        locale: options.locale,
        readonly: options.readonly,
        editorOptions: options.editorOptions,
        isReady: Boolean(editor),
        isDirty: meta.isDirty,
        isEmpty: meta.isEmpty,
        focus: () => {
            editor?.commands.focus();
        },
        blur: () => {
            editor?.commands.blur();
        },
        clear: () => {
            editor?.commands.clearContent();
        },
        markClean: () => {
            setMeta((current) => ({ ...current, isDirty: false }));
        },
        setContent: (value, setContentOptions) => {
            const currentOptions = latestOptionsRef.current;
            const nextContent = importEditorContent(value, {
                from: setContentOptions?.format ?? 'json',
                extensions: currentOptions.extensions,
                editorOptions: currentOptions.editorOptions,
                attributeSanitizers: currentOptions.attributeSanitizers,
                htmlPolicy: currentOptions.htmlPolicy,
            }).value;

            editor?.commands.setContent(nextContent, {
                emitUpdate: setContentOptions?.emitUpdate ?? false,
            });
            setMeta({
                isDirty: true,
                isEmpty: editor?.isEmpty ?? false,
            });
        },
        getJSON: getJson,
        getText: () => editor?.getText() ?? '',
        getHTML: () => exportTo('html'),
        getMarkdown: () => exportTo('markdown'),
        exportTo,
    };
}
