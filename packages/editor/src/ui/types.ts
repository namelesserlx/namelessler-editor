import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { ColorOption, ColorSwatchRenderer } from './color/colorPalette';
import type { BubbleMenuCommandRegistry } from './menus/bubbleMenuCommands';
import type { ToolbarCommandRegistry, ToolbarSlot } from './toolbar/toolbarCommands';

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

export interface EditorBubbleMenuOptions {
    enabled?: boolean;
    zIndex?: number;
    shouldShow?: EditorBubbleMenuShouldShow | null;
    commands?: BubbleMenuCommandRegistry;
}

export type EditorBubbleMenuConfig = boolean | EditorBubbleMenuOptions;

export interface EditorToolbarOptions {
    enabled?: boolean;
    commands?: ToolbarCommandRegistry;
    slots?: ToolbarSlot[];
}

export type EditorToolbarConfig = boolean | EditorToolbarOptions;

export type EditorTooltipPlacement = 'top' | 'bottom';

export interface EditorTooltipOptions {
    enabled?: boolean;
    delay?: number;
    closeDelay?: number;
    placement?: EditorTooltipPlacement;
    offset?: number;
    viewportPadding?: number;
    zIndex?: number;
}

export type EditorTooltipConfig = boolean | EditorTooltipOptions;

export interface EditorColorPickerOptions {
    enabled?: boolean;
    textColors?: ColorOption[];
    backgroundColors?: ColorOption[];
    renderSwatch?: ColorSwatchRenderer;
}

export type EditorColorPickerConfig = boolean | EditorColorPickerOptions;

export interface EditorUiOptions {
    toolbar?: EditorToolbarConfig;
    bubbleMenu?: EditorBubbleMenuConfig;
    tooltip?: EditorTooltipConfig;
    linkPopover?: boolean;
    colorPicker?: EditorColorPickerConfig;
}

export type EditorUiConfig = boolean | EditorUiOptions;

export interface ResolvedEditorBubbleMenuOptions {
    enabled: boolean;
    zIndex: number;
    shouldShow?: EditorBubbleMenuShouldShow | null;
    commands?: BubbleMenuCommandRegistry;
}

export interface ResolvedEditorToolbarOptions {
    enabled: boolean;
    commands?: ToolbarCommandRegistry;
    slots?: ToolbarSlot[];
}

export interface ResolvedEditorTooltipOptions {
    enabled: boolean;
    delay: number;
    closeDelay: number;
    placement: EditorTooltipPlacement;
    offset: number;
    viewportPadding: number;
    zIndex: number;
}

export interface ResolvedEditorColorPickerOptions {
    enabled: boolean;
    textColors?: ColorOption[];
    backgroundColors?: ColorOption[];
    renderSwatch?: ColorSwatchRenderer;
}

export interface ResolvedEditorUiOptions {
    toolbar: ResolvedEditorToolbarOptions;
    bubbleMenu: ResolvedEditorBubbleMenuOptions;
    tooltip: ResolvedEditorTooltipOptions;
    linkPopover: boolean;
    colorPicker: ResolvedEditorColorPickerOptions;
}

export const DEFAULT_EDITOR_BUBBLE_MENU: ResolvedEditorBubbleMenuOptions = {
    enabled: true,
    zIndex: 9999,
};

export const DEFAULT_EDITOR_TOOLBAR: ResolvedEditorToolbarOptions = {
    enabled: true,
};

export const DEFAULT_EDITOR_TOOLTIP: ResolvedEditorTooltipOptions = {
    enabled: true,
    delay: 300,
    closeDelay: 0,
    placement: 'top',
    offset: 8,
    viewportPadding: 8,
    zIndex: 10020,
};

export const DEFAULT_EDITOR_COLOR_PICKER: ResolvedEditorColorPickerOptions = {
    enabled: true,
};

export const DEFAULT_EDITOR_UI: ResolvedEditorUiOptions = {
    toolbar: DEFAULT_EDITOR_TOOLBAR,
    bubbleMenu: DEFAULT_EDITOR_BUBBLE_MENU,
    tooltip: DEFAULT_EDITOR_TOOLTIP,
    linkPopover: true,
    colorPicker: DEFAULT_EDITOR_COLOR_PICKER,
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
        commands: bubbleMenu.commands,
    };
}

function resolveToolbarOptions(
    toolbar: EditorToolbarConfig | undefined,
): ResolvedEditorToolbarOptions {
    if (toolbar === false) {
        return {
            ...DEFAULT_EDITOR_TOOLBAR,
            enabled: false,
        };
    }

    if (toolbar === true || toolbar === undefined) {
        return DEFAULT_EDITOR_TOOLBAR;
    }

    return {
        enabled: toolbar.enabled ?? DEFAULT_EDITOR_TOOLBAR.enabled,
        commands: toolbar.commands,
        slots: toolbar.slots,
    };
}

function resolveTooltipOptions(
    tooltip: EditorTooltipConfig | undefined,
): ResolvedEditorTooltipOptions {
    if (tooltip === false) {
        return {
            ...DEFAULT_EDITOR_TOOLTIP,
            enabled: false,
        };
    }

    if (tooltip === true || tooltip === undefined) {
        return DEFAULT_EDITOR_TOOLTIP;
    }

    return {
        enabled: tooltip.enabled ?? DEFAULT_EDITOR_TOOLTIP.enabled,
        delay: tooltip.delay ?? DEFAULT_EDITOR_TOOLTIP.delay,
        closeDelay: tooltip.closeDelay ?? DEFAULT_EDITOR_TOOLTIP.closeDelay,
        placement: tooltip.placement ?? DEFAULT_EDITOR_TOOLTIP.placement,
        offset: tooltip.offset ?? DEFAULT_EDITOR_TOOLTIP.offset,
        viewportPadding: tooltip.viewportPadding ?? DEFAULT_EDITOR_TOOLTIP.viewportPadding,
        zIndex: tooltip.zIndex ?? DEFAULT_EDITOR_TOOLTIP.zIndex,
    };
}

export function resolveEditorColorPickerOptions(
    colorPicker: EditorColorPickerConfig | undefined,
): ResolvedEditorColorPickerOptions {
    if (colorPicker === false) {
        return {
            ...DEFAULT_EDITOR_COLOR_PICKER,
            enabled: false,
        };
    }

    if (colorPicker === true || colorPicker === undefined) {
        return DEFAULT_EDITOR_COLOR_PICKER;
    }

    return {
        enabled: colorPicker.enabled ?? DEFAULT_EDITOR_COLOR_PICKER.enabled,
        textColors: colorPicker.textColors,
        backgroundColors: colorPicker.backgroundColors,
        renderSwatch: colorPicker.renderSwatch,
    };
}

export function resolveEditorUiOptions(ui: EditorUiConfig | undefined): ResolvedEditorUiOptions {
    if (ui === false) {
        return {
            toolbar: {
                ...DEFAULT_EDITOR_TOOLBAR,
                enabled: false,
            },
            bubbleMenu: {
                ...DEFAULT_EDITOR_BUBBLE_MENU,
                enabled: false,
            },
            tooltip: {
                ...DEFAULT_EDITOR_TOOLTIP,
                enabled: false,
            },
            linkPopover: false,
            colorPicker: {
                ...DEFAULT_EDITOR_COLOR_PICKER,
                enabled: false,
            },
        };
    }

    if (ui === true || ui === undefined) {
        return DEFAULT_EDITOR_UI;
    }

    return {
        toolbar: resolveToolbarOptions(ui.toolbar),
        bubbleMenu: resolveBubbleMenuOptions(ui.bubbleMenu),
        tooltip: resolveTooltipOptions(ui.tooltip),
        linkPopover: ui.linkPopover ?? DEFAULT_EDITOR_UI.linkPopover,
        colorPicker: resolveEditorColorPickerOptions(ui.colorPicker),
    };
}
