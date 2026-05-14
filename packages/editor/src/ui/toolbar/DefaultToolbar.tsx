import type { Editor as TiptapEditor } from '@tiptap/react';
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../../i18n';
import type { EditorFeatureFlags } from '../../core/createEditorExtensions';
import type { EditorColorPickerConfig } from '../types';
import { resolveEditorColorPickerOptions } from '../types';
import {
    resolveToolbarCommands,
    type ToolbarCommand,
    type ToolbarCommandRegistry,
    type ToolbarPopover,
    type ToolbarSlot,
} from './toolbarCommands';
import { useEditorSnapshot } from '../hooks/useEditorSnapshot';

export interface DefaultToolbarProps {
    editor: TiptapEditor;
    features?: Partial<EditorFeatureFlags>;
    locale?: EditorLocale;
    linkPopover?: boolean;
    colorPicker?: EditorColorPickerConfig;
    commands?: ToolbarCommandRegistry;
    slots?: ToolbarSlot[];
}

interface ToolbarGroup {
    id: string;
    nodes: Array<{ id: string; node: ReactNode }>;
}

function pushToolbarNode(groups: ToolbarGroup[], command: ToolbarCommand, node: ReactNode) {
    const currentGroup = groups.at(-1);

    if (currentGroup?.id === command.group) {
        currentGroup.nodes.push({ id: command.id, node });
        return;
    }

    groups.push({
        id: command.group,
        nodes: [{ id: command.id, node }],
    });
}

export function DefaultToolbar({
    editor,
    features,
    locale = DEFAULT_EDITOR_LOCALE,
    linkPopover = true,
    colorPicker = true,
    commands,
    slots,
}: DefaultToolbarProps) {
    const snapshotVersion = useEditorSnapshot(editor, { update: false });
    const messages = resolveEditorMessages(locale);
    const resolvedColorPicker = resolveEditorColorPickerOptions(colorPicker);
    const [activePopover, setActivePopover] = useState<ToolbarPopover | null>(null);
    const { from, to } = editor.state.selection;
    const selectionKey = `${from}:${to}`;

    useEffect(() => {
        setActivePopover(null);
    }, [selectionKey]);

    const setPopoverOpen = useCallback(
        (popover: ToolbarPopover) => (open: boolean) => {
            setActivePopover((current) => {
                if (open) {
                    return popover;
                }

                return current === popover ? null : current;
            });
        },
        [],
    );

    const context = useMemo(
        () => ({
            editor,
            snapshotVersion,
            features,
            locale,
            messages,
            linkPopover,
            colorPicker: resolvedColorPicker,
            activePopover,
            setPopoverOpen,
            selectionKey,
        }),
        [
            activePopover,
            editor,
            features,
            linkPopover,
            locale,
            messages,
            resolvedColorPicker,
            selectionKey,
            setPopoverOpen,
            snapshotVersion,
        ],
    );

    const renderedGroups = useMemo(() => {
        const groups: ToolbarGroup[] = [];

        for (const command of resolveToolbarCommands(commands, context)) {
            const node = command.render(context);
            if (node === null || node === undefined || node === false) {
                continue;
            }

            pushToolbarNode(groups, command, node);
        }

        return groups;
    }, [commands, context]);

    const renderSlots = (placement: ToolbarSlot['placement']) =>
        slots
            ?.filter((slot) => slot.placement === placement)
            .map((slot) => (
                <span
                    key={slot.key}
                    className="nlx-editor-toolbar-slot"
                    data-nameless-editor-toolbar-slot-placement={placement}
                >
                    {slot.render(context)}
                </span>
            ));

    return (
        <div
            className="nlx-editor-toolbar"
            role="toolbar"
            aria-label={messages.toolbar.heading}
            data-nameless-editor-toolbar="true"
        >
            {renderSlots('start')}
            {renderedGroups.map((group, index) => (
                <Fragment key={`${group.id}-${index}`}>
                    {index > 0 || slots?.some((slot) => slot.placement === 'start') ? (
                        <span className="nlx-editor-toolbar-divider" aria-hidden="true" />
                    ) : null}
                    <span
                        className="nlx-editor-toolbar-group"
                        role="group"
                        data-nameless-editor-toolbar-group={group.id}
                    >
                        {group.nodes.map((item) => (
                            <Fragment key={item.id}>{item.node}</Fragment>
                        ))}
                    </span>
                </Fragment>
            ))}
            {slots?.some((slot) => slot.placement === 'end') ? (
                <span className="nlx-editor-toolbar-divider" aria-hidden="true" />
            ) : null}
            {renderSlots('end')}
        </div>
    );
}
