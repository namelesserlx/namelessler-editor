import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorFeatureFlags } from '../core/createEditorExtensions';
import { DEFAULT_EDITOR_LOCALE, type EditorLocale } from '../i18n';
import { DefaultBubbleMenu } from './DefaultBubbleMenu';
import { DefaultToolbar } from './DefaultToolbar';
import { TableBubbleMenu } from './TableBubbleMenu';
import type { EditorUiConfig } from './types';
import { resolveEditorUiOptions } from './types';

export interface DefaultEditorUiProps {
    editor: TiptapEditor;
    features?: Partial<EditorFeatureFlags>;
    locale?: EditorLocale;
    ui?: EditorUiConfig;
}

export function DefaultEditorUi({
    editor,
    features,
    locale = DEFAULT_EDITOR_LOCALE,
    ui,
}: DefaultEditorUiProps) {
    const resolvedUi = resolveEditorUiOptions(ui);
    const canRenderFloatingMenus =
        typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined';

    return (
        <>
            {resolvedUi.toolbar ? (
                <DefaultToolbar
                    editor={editor}
                    features={features}
                    locale={locale}
                    linkPopover={resolvedUi.linkPopover}
                    colorPicker={resolvedUi.colorPicker}
                />
            ) : null}
            {resolvedUi.bubbleMenu && canRenderFloatingMenus ? (
                <DefaultBubbleMenu
                    editor={editor}
                    features={features}
                    locale={locale}
                    linkPopover={resolvedUi.linkPopover}
                    colorPicker={resolvedUi.colorPicker}
                />
            ) : null}
            {resolvedUi.bubbleMenu && canRenderFloatingMenus ? (
                <TableBubbleMenu
                    editor={editor}
                    locale={locale}
                    zIndex={resolvedUi.bubbleMenu.zIndex}
                />
            ) : null}
        </>
    );
}
