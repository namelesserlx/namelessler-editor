import React, { useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { DefaultEditorUi } from '../ui/shell/DefaultEditorUi';
import { useEditorController } from './useEditorController';
import type { EditorController, EditorProps } from './types';

interface EditorViewProps extends EditorProps {
    controller: EditorController;
}

const EditorView: React.FC<EditorViewProps> = ({
    controller,
    className,
    style,
    readonly,
    ui,
    editorOptions,
    locale,
}) => {
    const { editor } = controller;
    const resolvedReadonly = readonly ?? controller.readonly ?? false;
    const resolvedEditorOptions = editorOptions ?? controller.editorOptions;
    const resolvedLocale = locale ?? controller.locale;

    useEffect(() => {
        if (!editor || editor.isDestroyed) {
            return;
        }

        editor.setEditable(!resolvedReadonly);
    }, [editor, resolvedReadonly]);

    const rootClassName = ['nlx-editor-root', className ?? ''].filter(Boolean).join(' ');

    return (
        <div className={rootClassName} style={style} data-nameless-editor="true">
            {editor && !resolvedReadonly ? (
                <DefaultEditorUi
                    editor={editor}
                    features={resolvedEditorOptions?.features}
                    locale={resolvedLocale}
                    ui={ui}
                />
            ) : null}
            {editor ? <EditorContent editor={editor} /> : null}
        </div>
    );
};

const InternalEditorRoot: React.FC<Omit<EditorProps, 'controller'>> = (props) => {
    const controller = useEditorController(props);

    return <EditorView {...props} controller={controller} />;
};

export const EditorRoot: React.FC<EditorProps> = (props) => {
    if (props.controller) {
        return <EditorView {...props} controller={props.controller} />;
    }

    return <InternalEditorRoot {...props} />;
};
