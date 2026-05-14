import type { Editor as TiptapEditor } from '@tiptap/react';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    CheckSquare,
    Code2,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Italic,
    List,
    ListOrdered,
    Minus,
    Pilcrow,
    Quote,
    Redo2,
    Strikethrough,
    Table2,
    Underline,
    Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { EditorFeatureFlags } from '../../core/createEditorExtensions';
import type { EditorLocale, EditorMessages } from '../../i18n';
import type { ResolvedEditorColorPickerOptions } from '../types';
import { TooltipMenuButton as MenuButton } from '../components/MenuButton';
import { ColorPicker } from '../popovers/ColorPicker';
import { LinkPopover } from '../popovers/LinkPopover';

export type ToolbarPopover = 'link' | 'textColor' | 'backgroundColor';

export interface ToolbarCommandContext {
    editor: TiptapEditor;
    snapshotVersion: number;
    features?: Partial<EditorFeatureFlags>;
    locale: EditorLocale;
    messages: EditorMessages;
    linkPopover: boolean;
    colorPicker: ResolvedEditorColorPickerOptions;
    activePopover: ToolbarPopover | null;
    setPopoverOpen: (popover: ToolbarPopover) => (open: boolean) => void;
    selectionKey: string;
}

export interface ToolbarCommand {
    id: string;
    group: string;
    render: (context: ToolbarCommandContext) => ReactNode;
}

export type ToolbarCommandRegistry =
    | ToolbarCommand[]
    | ((defaults: ToolbarCommand[], context: ToolbarCommandContext) => ToolbarCommand[]);

export interface ToolbarSlot {
    key: string;
    placement: 'start' | 'end';
    render: (context: ToolbarCommandContext) => ReactNode;
}

function enabled(features: Partial<EditorFeatureFlags> | undefined, key: keyof EditorFeatureFlags) {
    return features?.[key] ?? true;
}

function icon(Icon: typeof Bold, size = 16) {
    return <Icon size={size} aria-hidden="true" />;
}

export const DEFAULT_TOOLBAR_COMMANDS: ToolbarCommand[] = [
    {
        id: 'paragraph',
        group: 'block',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('paragraph')}
                label={messages.toolbar.paragraph}
                onClick={() => editor.chain().focus().setParagraph().run()}
            >
                {icon(Pilcrow)}
            </MenuButton>
        ),
    },
    {
        id: 'heading-1',
        group: 'block',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('heading', { level: 1 })}
                label={messages.toolbar.heading1}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
                {icon(Heading1)}
            </MenuButton>
        ),
    },
    {
        id: 'heading-2',
        group: 'block',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('heading', { level: 2 })}
                label={messages.toolbar.heading2}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                {icon(Heading2)}
            </MenuButton>
        ),
    },
    {
        id: 'heading-3',
        group: 'block',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('heading', { level: 3 })}
                label={messages.toolbar.heading3}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                {icon(Heading3)}
            </MenuButton>
        ),
    },
    {
        id: 'heading-4',
        group: 'block',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('heading', { level: 4 })}
                label={messages.toolbar.heading4}
                onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            >
                {icon(Heading4)}
            </MenuButton>
        ),
    },
    {
        id: 'bold',
        group: 'marks',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('bold')}
                label={messages.toolbar.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                {icon(Bold)}
            </MenuButton>
        ),
    },
    {
        id: 'italic',
        group: 'marks',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('italic')}
                label={messages.toolbar.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                {icon(Italic)}
            </MenuButton>
        ),
    },
    {
        id: 'underline',
        group: 'marks',
        render: ({ editor, features, messages }) =>
            enabled(features, 'underline') ? (
                <MenuButton
                    active={editor.isActive('underline')}
                    label={messages.toolbar.underline}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    {icon(Underline)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'strike',
        group: 'marks',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('strike')}
                label={messages.toolbar.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                {icon(Strikethrough)}
            </MenuButton>
        ),
    },
    {
        id: 'code',
        group: 'marks',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('code')}
                label={messages.toolbar.code}
                onClick={() => editor.chain().focus().toggleCode().run()}
            >
                {icon(Code2)}
            </MenuButton>
        ),
    },
    {
        id: 'link',
        group: 'marks',
        render: ({
            editor,
            features,
            linkPopover,
            locale,
            activePopover,
            setPopoverOpen,
            selectionKey,
        }) =>
            enabled(features, 'links') && linkPopover ? (
                <LinkPopover
                    editor={editor}
                    locale={locale}
                    selectionKey={selectionKey}
                    open={activePopover === 'link'}
                    onOpenChange={setPopoverOpen('link')}
                />
            ) : null,
    },
    {
        id: 'text-color',
        group: 'marks',
        render: ({ editor, features, colorPicker, locale, activePopover, setPopoverOpen }) =>
            enabled(features, 'color') && colorPicker.enabled ? (
                <ColorPicker
                    editor={editor}
                    locale={locale}
                    mode="text"
                    open={activePopover === 'textColor'}
                    onOpenChange={setPopoverOpen('textColor')}
                    colors={colorPicker.textColors}
                    renderSwatch={colorPicker.renderSwatch}
                />
            ) : null,
    },
    {
        id: 'background-color',
        group: 'marks',
        render: ({ editor, features, colorPicker, locale, activePopover, setPopoverOpen }) =>
            enabled(features, 'highlight') && colorPicker.enabled ? (
                <ColorPicker
                    editor={editor}
                    locale={locale}
                    mode="background"
                    open={activePopover === 'backgroundColor'}
                    onOpenChange={setPopoverOpen('backgroundColor')}
                    colors={colorPicker.backgroundColors}
                    renderSwatch={colorPicker.renderSwatch}
                />
            ) : null,
    },
    {
        id: 'bullet-list',
        group: 'blocks',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('bulletList')}
                label={messages.toolbar.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                {icon(List)}
            </MenuButton>
        ),
    },
    {
        id: 'ordered-list',
        group: 'blocks',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('orderedList')}
                label={messages.toolbar.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                {icon(ListOrdered)}
            </MenuButton>
        ),
    },
    {
        id: 'task-list',
        group: 'blocks',
        render: ({ editor, features, messages }) =>
            enabled(features, 'taskList') ? (
                <MenuButton
                    active={editor.isActive('taskList')}
                    label={messages.toolbar.taskList}
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                >
                    {icon(CheckSquare)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'blockquote',
        group: 'blocks',
        render: ({ editor, messages }) => (
            <MenuButton
                active={editor.isActive('blockquote')}
                label={messages.toolbar.blockquote}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                {icon(Quote)}
            </MenuButton>
        ),
    },
    {
        id: 'code-block',
        group: 'blocks',
        render: ({ editor, features, messages }) =>
            enabled(features, 'codeBlock') ? (
                <MenuButton
                    active={editor.isActive('codeBlock')}
                    label={messages.toolbar.codeBlock}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                    {icon(Code2)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'table',
        group: 'blocks',
        render: ({ editor, features, messages }) =>
            enabled(features, 'tables') ? (
                <MenuButton
                    label={messages.toolbar.table}
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                            .run()
                    }
                >
                    {icon(Table2)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'horizontal-rule',
        group: 'blocks',
        render: ({ editor, messages }) => (
            <MenuButton
                label={messages.toolbar.horizontalRule}
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
                {icon(Minus)}
            </MenuButton>
        ),
    },
    {
        id: 'align-left',
        group: 'align',
        render: ({ editor, features, messages }) =>
            enabled(features, 'textAlign') ? (
                <MenuButton
                    active={editor.isActive({ textAlign: 'left' })}
                    label={messages.toolbar.alignLeft}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                >
                    {icon(AlignLeft)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'align-center',
        group: 'align',
        render: ({ editor, features, messages }) =>
            enabled(features, 'textAlign') ? (
                <MenuButton
                    active={editor.isActive({ textAlign: 'center' })}
                    label={messages.toolbar.alignCenter}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                >
                    {icon(AlignCenter)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'align-right',
        group: 'align',
        render: ({ editor, features, messages }) =>
            enabled(features, 'textAlign') ? (
                <MenuButton
                    active={editor.isActive({ textAlign: 'right' })}
                    label={messages.toolbar.alignRight}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                >
                    {icon(AlignRight)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'align-justify',
        group: 'align',
        render: ({ editor, features, messages }) =>
            enabled(features, 'textAlign') ? (
                <MenuButton
                    active={editor.isActive({ textAlign: 'justify' })}
                    label={messages.toolbar.alignJustify}
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                >
                    {icon(AlignJustify)}
                </MenuButton>
            ) : null,
    },
    {
        id: 'undo',
        group: 'history',
        render: ({ editor, messages }) => (
            <MenuButton
                label={messages.toolbar.undo}
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
            >
                {icon(Undo2)}
            </MenuButton>
        ),
    },
    {
        id: 'redo',
        group: 'history',
        render: ({ editor, messages }) => (
            <MenuButton
                label={messages.toolbar.redo}
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
            >
                {icon(Redo2)}
            </MenuButton>
        ),
    },
];

export function resolveToolbarCommands(
    registry: ToolbarCommandRegistry | undefined,
    context: ToolbarCommandContext,
): ToolbarCommand[] {
    if (!registry) {
        return DEFAULT_TOOLBAR_COMMANDS;
    }

    if (typeof registry === 'function') {
        return registry(DEFAULT_TOOLBAR_COMMANDS, context);
    }

    return registry;
}
