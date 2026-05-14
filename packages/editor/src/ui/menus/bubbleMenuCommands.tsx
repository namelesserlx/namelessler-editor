import type { Editor as TiptapEditor } from '@tiptap/react';
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Code2,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Italic,
    Link2,
    Pilcrow,
    Quote,
    Strikethrough,
    Underline,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { EditorFeatureFlags } from '../../core/createEditorExtensions';
import type { EditorLocale, EditorMessages } from '../../i18n';
import { TooltipMenuButton as MenuButton } from '../components/MenuButton';
import { BubbleColorPicker } from '../popovers/BubbleColorPicker';
import { BubbleMenuSelect } from '../popovers/BubbleMenuSelect';
import type { ResolvedEditorColorPickerOptions } from '../types';

export type BubbleMenuPopover = string;

export interface BubbleMenuCommandContext {
    activePopover: BubbleMenuPopover | null;
    closeLinkPanel: () => void;
    closePopovers: () => void;
    colorPicker: ResolvedEditorColorPickerOptions;
    currentAlign: 'left' | 'center' | 'right';
    currentAlignLabel: string;
    currentBlockLabel: string;
    currentBlockType: 'paragraph' | 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4';
    editor: TiptapEditor;
    features?: Partial<EditorFeatureFlags>;
    linkPopover: boolean;
    locale: EditorLocale;
    messages: EditorMessages;
    openLinkPanel: () => void;
    runCommand: (command: () => void) => void;
    selectionKey: string;
    setPopoverOpen: (popover: BubbleMenuPopover) => (open: boolean) => void;
    snapshotVersion: number;
}

export interface BubbleMenuCommand {
    group: string;
    id: string;
    render: (context: BubbleMenuCommandContext) => ReactNode;
}

export type BubbleMenuCommandRegistry =
    | BubbleMenuCommand[]
    | ((defaults: BubbleMenuCommand[], context: BubbleMenuCommandContext) => BubbleMenuCommand[]);

function enabled(features: Partial<EditorFeatureFlags> | undefined, key: keyof EditorFeatureFlags) {
    return features?.[key] ?? true;
}

function icon(Icon: typeof Bold, size = 14) {
    return <Icon size={size} aria-hidden="true" />;
}

export const DEFAULT_BUBBLE_MENU_COMMANDS: BubbleMenuCommand[] = [
    {
        id: 'style',
        group: 'style',
        render: ({
            currentBlockLabel,
            currentBlockType,
            editor,
            messages,
            runCommand,
            activePopover,
            setPopoverOpen,
        }) => (
            <BubbleMenuSelect
                ariaLabel={currentBlockLabel}
                tooltip={currentBlockLabel}
                open={activePopover === 'style'}
                onOpenChange={setPopoverOpen('style')}
                triggerDataAttribute={{
                    name: 'data-nameless-editor-style-trigger',
                    value: 'true',
                }}
                options={[
                    {
                        key: 'paragraph',
                        label: messages.toolbar.paragraph,
                        active: currentBlockType === 'paragraph',
                        icon: icon(Pilcrow),
                        dataAttribute: {
                            name: 'data-nameless-editor-style-option',
                            value: 'paragraph',
                        },
                        onSelect: () =>
                            runCommand(() => editor.chain().focus().setParagraph().run()),
                    },
                    {
                        key: 'heading-1',
                        label: messages.toolbar.heading1,
                        active: currentBlockType === 'heading-1',
                        icon: icon(Heading1),
                        dataAttribute: {
                            name: 'data-nameless-editor-style-option',
                            value: 'heading-1',
                        },
                        onSelect: () =>
                            runCommand(() =>
                                editor.chain().focus().toggleHeading({ level: 1 }).run(),
                            ),
                    },
                    {
                        key: 'heading-2',
                        label: messages.toolbar.heading2,
                        active: currentBlockType === 'heading-2',
                        icon: icon(Heading2),
                        dataAttribute: {
                            name: 'data-nameless-editor-style-option',
                            value: 'heading-2',
                        },
                        onSelect: () =>
                            runCommand(() =>
                                editor.chain().focus().toggleHeading({ level: 2 }).run(),
                            ),
                    },
                    {
                        key: 'heading-3',
                        label: messages.toolbar.heading3,
                        active: currentBlockType === 'heading-3',
                        icon: icon(Heading3),
                        dataAttribute: {
                            name: 'data-nameless-editor-style-option',
                            value: 'heading-3',
                        },
                        onSelect: () =>
                            runCommand(() =>
                                editor.chain().focus().toggleHeading({ level: 3 }).run(),
                            ),
                    },
                    {
                        key: 'heading-4',
                        label: messages.toolbar.heading4,
                        active: currentBlockType === 'heading-4',
                        icon: icon(Heading4),
                        dataAttribute: {
                            name: 'data-nameless-editor-style-option',
                            value: 'heading-4',
                        },
                        onSelect: () =>
                            runCommand(() =>
                                editor.chain().focus().toggleHeading({ level: 4 }).run(),
                            ),
                    },
                ]}
            >
                <span className="nlx-editor-bubble-menu-select-label">{currentBlockLabel}</span>
            </BubbleMenuSelect>
        ),
    },
    {
        id: 'align',
        group: 'align',
        render: ({
            activePopover,
            currentAlign,
            currentAlignLabel,
            editor,
            features,
            messages,
            runCommand,
            setPopoverOpen,
        }) =>
            enabled(features, 'textAlign') ? (
                <BubbleMenuSelect
                    ariaLabel={currentAlignLabel}
                    tooltip={currentAlignLabel}
                    open={activePopover === 'align'}
                    onOpenChange={setPopoverOpen('align')}
                    triggerDataAttribute={{
                        name: 'data-nameless-editor-align-trigger',
                        value: 'true',
                    }}
                    options={[
                        {
                            key: 'left',
                            label: messages.toolbar.alignLeft,
                            active: currentAlign === 'left',
                            icon: icon(AlignLeft),
                            dataAttribute: {
                                name: 'data-nameless-editor-align-option',
                                value: 'left',
                            },
                            onSelect: () =>
                                runCommand(() => editor.chain().focus().setTextAlign('left').run()),
                        },
                        {
                            key: 'center',
                            label: messages.toolbar.alignCenter,
                            active: currentAlign === 'center',
                            icon: icon(AlignCenter),
                            dataAttribute: {
                                name: 'data-nameless-editor-align-option',
                                value: 'center',
                            },
                            onSelect: () =>
                                runCommand(() =>
                                    editor.chain().focus().setTextAlign('center').run(),
                                ),
                        },
                        {
                            key: 'right',
                            label: messages.toolbar.alignRight,
                            active: currentAlign === 'right',
                            icon: icon(AlignRight),
                            dataAttribute: {
                                name: 'data-nameless-editor-align-option',
                                value: 'right',
                            },
                            onSelect: () =>
                                runCommand(() =>
                                    editor.chain().focus().setTextAlign('right').run(),
                                ),
                        },
                    ]}
                >
                    {currentAlign === 'center'
                        ? icon(AlignCenter, 16)
                        : currentAlign === 'right'
                          ? icon(AlignRight, 16)
                          : icon(AlignLeft, 16)}
                </BubbleMenuSelect>
            ) : null,
    },
    {
        id: 'bold',
        group: 'marks',
        render: ({ editor, messages, runCommand }) => (
            <MenuButton
                active={editor.isActive('bold')}
                label={messages.toolbar.bold}
                onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
            >
                {icon(Bold)}
            </MenuButton>
        ),
    },
    {
        id: 'strike',
        group: 'marks',
        render: ({ editor, messages, runCommand }) => (
            <MenuButton
                active={editor.isActive('strike')}
                label={messages.toolbar.strike}
                onClick={() => runCommand(() => editor.chain().focus().toggleStrike().run())}
            >
                {icon(Strikethrough)}
            </MenuButton>
        ),
    },
    {
        id: 'italic',
        group: 'marks',
        render: ({ editor, messages, runCommand }) => (
            <MenuButton
                active={editor.isActive('italic')}
                label={messages.toolbar.italic}
                onClick={() => runCommand(() => editor.chain().focus().toggleItalic().run())}
            >
                {icon(Italic)}
            </MenuButton>
        ),
    },
    {
        id: 'underline',
        group: 'marks',
        render: ({ editor, features, messages, runCommand }) =>
            enabled(features, 'underline') ? (
                <MenuButton
                    active={editor.isActive('underline')}
                    label={messages.toolbar.underline}
                    onClick={() => runCommand(() => editor.chain().focus().toggleUnderline().run())}
                >
                    {icon(Underline)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'link',
        group: 'inline',
        render: ({
            activePopover,
            closeLinkPanel,
            editor,
            features,
            linkPopover,
            messages,
            openLinkPanel,
        }) =>
            enabled(features, 'links') && linkPopover ? (
                <MenuButton
                    active={editor.isActive('link') || activePopover === 'link'}
                    label={messages.toolbar.link}
                    onClick={() => {
                        if (activePopover === 'link') {
                            closeLinkPanel();
                        } else {
                            openLinkPanel();
                        }
                    }}
                >
                    {icon(Link2)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'code',
        group: 'inline',
        render: ({ editor, messages, runCommand }) => (
            <MenuButton
                active={editor.isActive('code')}
                label={messages.toolbar.code}
                onClick={() => runCommand(() => editor.chain().focus().toggleCode().run())}
            >
                {icon(Code2)}
            </MenuButton>
        ),
    },
    {
        id: 'blockquote',
        group: 'inline',
        render: ({ editor, messages, runCommand }) => (
            <MenuButton
                active={editor.isActive('blockquote')}
                label={messages.toolbar.blockquote}
                onClick={() => runCommand(() => editor.chain().focus().toggleBlockquote().run())}
            >
                {icon(Quote)}
            </MenuButton>
        ),
    },
    {
        id: 'colors',
        group: 'colors',
        render: ({ activePopover, colorPicker, editor, features, locale, setPopoverOpen }) => {
            const allowTextColor = enabled(features, 'color') && colorPicker.enabled;
            const allowBackgroundColor = enabled(features, 'highlight') && colorPicker.enabled;

            return allowTextColor || allowBackgroundColor ? (
                <BubbleColorPicker
                    editor={editor}
                    locale={locale}
                    open={activePopover === 'colors'}
                    onOpenChange={setPopoverOpen('colors')}
                    allowTextColor={allowTextColor}
                    allowBackgroundColor={allowBackgroundColor}
                    textColors={colorPicker.textColors}
                    backgroundColors={colorPicker.backgroundColors}
                    renderSwatch={colorPicker.renderSwatch}
                />
            ) : null;
        },
    },
];

export function resolveBubbleMenuCommands(
    registry: BubbleMenuCommandRegistry | undefined,
    context: BubbleMenuCommandContext,
): BubbleMenuCommand[] {
    if (!registry) {
        return DEFAULT_BUBBLE_MENU_COMMANDS;
    }

    if (typeof registry === 'function') {
        return registry(DEFAULT_BUBBLE_MENU_COMMANDS, context);
    }

    return registry;
}
