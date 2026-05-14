import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorFeatureFlags } from '../../core/createEditorExtensions';
import { DEFAULT_EDITOR_LOCALE, type EditorLocale } from '../../i18n';
import { DefaultBubbleMenu } from '../menus/DefaultBubbleMenu';
import { TableBubbleMenu } from '../menus/TableBubbleMenu';
import { EditorTooltipProvider } from '../tooltip/EditorTooltipProvider';
import { DefaultToolbar } from '../toolbar/DefaultToolbar';
import type { EditorUiConfig } from '../types';
import { resolveEditorUiOptions } from '../types';

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

    const content = (
        <>
            {resolvedUi.toolbar.enabled ? (
                <DefaultToolbar
                    editor={editor}
                    features={features}
                    locale={locale}
                    linkPopover={resolvedUi.linkPopover}
                    colorPicker={resolvedUi.colorPicker}
                    commands={resolvedUi.toolbar.commands}
                    slots={resolvedUi.toolbar.slots}
                />
            ) : null}
            {resolvedUi.bubbleMenu.enabled && canRenderFloatingMenus ? (
                <DefaultBubbleMenu
                    editor={editor}
                    features={features}
                    locale={locale}
                    linkPopover={resolvedUi.linkPopover}
                    colorPicker={resolvedUi.colorPicker}
                    zIndex={resolvedUi.bubbleMenu.zIndex}
                    shouldShow={resolvedUi.bubbleMenu.shouldShow}
                    commands={resolvedUi.bubbleMenu.commands}
                />
            ) : null}
            {resolvedUi.bubbleMenu.enabled && canRenderFloatingMenus ? (
                <TableBubbleMenu
                    editor={editor}
                    locale={locale}
                    zIndex={resolvedUi.bubbleMenu.zIndex}
                />
            ) : null}
        </>
    );

    if (!resolvedUi.tooltip.enabled) {
        return content;
    }

    return (
        <EditorTooltipProvider
            closeDelay={resolvedUi.tooltip.closeDelay}
            delay={resolvedUi.tooltip.delay}
            offset={resolvedUi.tooltip.offset}
            placement={resolvedUi.tooltip.placement}
            viewportPadding={resolvedUi.tooltip.viewportPadding}
            zIndex={resolvedUi.tooltip.zIndex}
        >
            {content}
        </EditorTooltipProvider>
    );
}
