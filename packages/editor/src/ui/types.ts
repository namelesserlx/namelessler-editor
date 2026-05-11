import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { ReactNode } from 'react';

export interface EditorBubbleMenuShouldShowContext {
    editor: TiptapEditor;
    element?: HTMLElement;
    view?: EditorView;
    state: EditorState;
    oldState?: EditorState;
    from: number;
    to: number;
}

export type EditorBubbleMenuShouldShow = (context: EditorBubbleMenuShouldShowContext) => boolean;

export interface EditorBubbleMenuCustomSection {
    key: string;
    placement: 'start' | 'end';
    render: (editor: TiptapEditor) => ReactNode;
    onClose?: () => void;
}

export interface EditorBubbleMenuOptions {
    enabled?: boolean;
    zIndex?: number;
    shouldShow?: EditorBubbleMenuShouldShow | null;
    customSections?: EditorBubbleMenuCustomSection[];
}

export type EditorBubbleMenuConfig = boolean | EditorBubbleMenuOptions;

export interface EditorUiOptions {
    toolbar?: boolean;
    bubbleMenu?: EditorBubbleMenuConfig;
    linkPopover?: boolean;
    colorPicker?: boolean;
}

export type EditorUiConfig = boolean | EditorUiOptions;

export interface ResolvedEditorBubbleMenuOptions {
    enabled: boolean;
    zIndex: number;
    shouldShow?: EditorBubbleMenuShouldShow | null;
    customSections?: EditorBubbleMenuCustomSection[];
}

export interface ResolvedEditorUiOptions {
    toolbar: boolean;
    bubbleMenu: ResolvedEditorBubbleMenuOptions;
    linkPopover: boolean;
    colorPicker: boolean;
}

export const DEFAULT_EDITOR_BUBBLE_MENU: ResolvedEditorBubbleMenuOptions = {
    enabled: true,
    zIndex: 9999,
};

export const DEFAULT_EDITOR_UI: ResolvedEditorUiOptions = {
    toolbar: true,
    bubbleMenu: DEFAULT_EDITOR_BUBBLE_MENU,
    linkPopover: true,
    colorPicker: true,
};

function resolveBubbleMenuOptions(
    bubbleMenu: EditorBubbleMenuConfig | undefined,
): ResolvedEditorBubbleMenuOptions {
    if (bubbleMenu === false) {
        return {
            ...DEFAULT_EDITOR_BUBBLE_MENU,
            enabled: false,
        };
    }

    if (bubbleMenu === true || bubbleMenu === undefined) {
        return DEFAULT_EDITOR_BUBBLE_MENU;
    }

    return {
        enabled: bubbleMenu.enabled ?? DEFAULT_EDITOR_BUBBLE_MENU.enabled,
        zIndex: bubbleMenu.zIndex ?? DEFAULT_EDITOR_BUBBLE_MENU.zIndex,
        shouldShow: bubbleMenu.shouldShow,
        customSections: bubbleMenu.customSections,
    };
}

export function resolveEditorUiOptions(ui: EditorUiConfig | undefined): ResolvedEditorUiOptions {
    if (ui === false) {
        return {
            toolbar: false,
            bubbleMenu: {
                ...DEFAULT_EDITOR_BUBBLE_MENU,
                enabled: false,
            },
            linkPopover: false,
            colorPicker: false,
        };
    }

    if (ui === true || ui === undefined) {
        return DEFAULT_EDITOR_UI;
    }

    return {
        toolbar: ui.toolbar ?? DEFAULT_EDITOR_UI.toolbar,
        bubbleMenu: resolveBubbleMenuOptions(ui.bubbleMenu),
        linkPopover: ui.linkPopover ?? DEFAULT_EDITOR_UI.linkPopover,
        colorPicker: ui.colorPicker ?? DEFAULT_EDITOR_UI.colorPicker,
    };
}
