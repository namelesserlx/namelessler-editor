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
import { useEffect, useState } from 'react';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../i18n';
import type { EditorFeatureFlags } from '../core/createEditorExtensions';
import { ColorPicker } from './ColorPicker';
import { LinkPopover } from './LinkPopover';
import { TooltipMenuButton as MenuButton } from './MenuButton';
import { useEditorSnapshot } from './useEditorSnapshot';

export interface DefaultToolbarProps {
    editor: TiptapEditor;
    features?: Partial<EditorFeatureFlags>;
    locale?: EditorLocale;
    linkPopover?: boolean;
    colorPicker?: boolean;
}

function enabled(features: Partial<EditorFeatureFlags> | undefined, key: keyof EditorFeatureFlags) {
    return features?.[key] ?? true;
}

type ToolbarPopover = 'link' | 'textColor' | 'backgroundColor';

export function DefaultToolbar({
    editor,
    features,
    locale = DEFAULT_EDITOR_LOCALE,
    linkPopover = true,
    colorPicker = true,
}: DefaultToolbarProps) {
    useEditorSnapshot(editor, { update: false });
    const resolvedMessages = resolveEditorMessages(locale);
    const [activePopover, setActivePopover] = useState<ToolbarPopover | null>(null);
    const { from, to } = editor.state.selection;
    const selectionKey = `${from}:${to}`;

    useEffect(() => {
        setActivePopover(null);
    }, [selectionKey]);

    const setPopoverOpen = (popover: ToolbarPopover) => (open: boolean) => {
        setActivePopover((current) => {
            if (open) {
                return popover;
            }

            return current === popover ? null : current;
        });
    };

    return (
        <div className="nlx-editor-toolbar" role="toolbar" data-nameless-editor-toolbar="true">
            <MenuButton
                active={editor.isActive('paragraph')}
                aria-label={resolvedMessages.toolbar.paragraph}
                title={resolvedMessages.toolbar.paragraph}
                onClick={() => editor.chain().focus().setParagraph().run()}
            >
                <Pilcrow size={16} aria-hidden="true" />
            </MenuButton>
            <MenuButton
                active={editor.isActive('heading', { level: 1 })}
                aria-label={resolvedMessages.toolbar.heading1}
                title={resolvedMessages.toolbar.heading1}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
                <Heading1 size={16} aria-hidden="true" />
            </MenuButton>
            <MenuButton
                active={editor.isActive('heading', { level: 2 })}
                aria-label={resolvedMessages.toolbar.heading2}
                title={resolvedMessages.toolbar.heading2}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <Heading2 size={16} aria-hidden="true" />
            </MenuButton>
            <MenuButton
                active={editor.isActive('heading', { level: 3 })}
                aria-label={resolvedMessages.toolbar.heading3}
                title={resolvedMessages.toolbar.heading3}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                <Heading3 size={16} aria-hidden="true" />
            </MenuButton>
            <span className="nlx-editor-toolbar-divider" aria-hidden="true" />
            <MenuButton
                active={editor.isActive('bold')}
                aria-label={resolvedMessages.toolbar.bold}
                title={resolvedMessages.toolbar.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold size={16} aria-hidden="true" />
            </MenuButton>
            <MenuButton
                active={editor.isActive('italic')}
                aria-label={resolvedMessages.toolbar.italic}
                title={resolvedMessages.toolbar.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic size={16} aria-hidden="true" />
            </MenuButton>
            {enabled(features, 'underline') ? (
                <MenuButton
                    active={editor.isActive('underline')}
                    aria-label={resolvedMessages.toolbar.underline}
                    title={resolvedMessages.toolbar.underline}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <Underline size={16} aria-hidden="true" />
                </MenuButton>
            ) : null}
            <MenuButton
                active={editor.isActive('strike')}
                aria-label={resolvedMessages.toolbar.strike}
                title={resolvedMessages.toolbar.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                <Strikethrough size={16} aria-hidden="true" />
            </MenuButton>
            <MenuButton
                active={editor.isActive('code')}
                aria-label={resolvedMessages.toolbar.code}
                title={resolvedMessages.toolbar.code}
                onClick={() => editor.chain().focus().toggleCode().run()}
            >
                <Code2 size={16} aria-hidden="true" />
            </MenuButton>
            {enabled(features, 'links') && linkPopover ? (
                <LinkPopover
                    editor={editor}
                    locale={locale}
                    selectionKey={selectionKey}
                    open={activePopover === 'link'}
                    onOpenChange={setPopoverOpen('link')}
                />
            ) : null}
            {enabled(features, 'color') && colorPicker ? (
                <ColorPicker
                    editor={editor}
                    locale={locale}
                    mode="text"
                    open={activePopover === 'textColor'}
                    onOpenChange={setPopoverOpen('textColor')}
                />
            ) : null}
            {enabled(features, 'highlight') && colorPicker ? (
                <ColorPicker
                    editor={editor}
                    locale={locale}
                    mode="background"
                    open={activePopover === 'backgroundColor'}
                    onOpenChange={setPopoverOpen('backgroundColor')}
                />
            ) : null}
            <span className="nlx-editor-toolbar-divider" aria-hidden="true" />
            <MenuButton
                active={editor.isActive('bulletList')}
                aria-label={resolvedMessages.toolbar.bulletList}
                title={resolvedMessages.toolbar.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <List size={16} aria-hidden="true" />
            </MenuButton>
            <MenuButton
                active={editor.isActive('orderedList')}
                aria-label={resolvedMessages.toolbar.orderedList}
                title={resolvedMessages.toolbar.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <ListOrdered size={16} aria-hidden="true" />
            </MenuButton>
            {enabled(features, 'taskList') ? (
                <MenuButton
                    active={editor.isActive('taskList')}
                    aria-label={resolvedMessages.toolbar.taskList}
                    title={resolvedMessages.toolbar.taskList}
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                >
                    <CheckSquare size={16} aria-hidden="true" />
                </MenuButton>
            ) : null}
            <MenuButton
                active={editor.isActive('blockquote')}
                aria-label={resolvedMessages.toolbar.blockquote}
                title={resolvedMessages.toolbar.blockquote}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <Quote size={16} aria-hidden="true" />
            </MenuButton>
            {enabled(features, 'codeBlock') ? (
                <MenuButton
                    active={editor.isActive('codeBlock')}
                    aria-label={resolvedMessages.toolbar.codeBlock}
                    title={resolvedMessages.toolbar.codeBlock}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                    <Code2 size={16} aria-hidden="true" />
                </MenuButton>
            ) : null}
            {enabled(features, 'tables') ? (
                <MenuButton
                    aria-label={resolvedMessages.toolbar.table}
                    title={resolvedMessages.toolbar.table}
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                            .run()
                    }
                >
                    <Table2 size={16} aria-hidden="true" />
                </MenuButton>
            ) : null}
            <MenuButton
                aria-label={resolvedMessages.toolbar.horizontalRule}
                title={resolvedMessages.toolbar.horizontalRule}
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
                <Minus size={16} aria-hidden="true" />
            </MenuButton>
            {enabled(features, 'textAlign') ? (
                <>
                    <span className="nlx-editor-toolbar-divider" aria-hidden="true" />
                    <MenuButton
                        active={editor.isActive({ textAlign: 'left' })}
                        aria-label={resolvedMessages.toolbar.alignLeft}
                        title={resolvedMessages.toolbar.alignLeft}
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    >
                        <AlignLeft size={16} aria-hidden="true" />
                    </MenuButton>
                    <MenuButton
                        active={editor.isActive({ textAlign: 'center' })}
                        aria-label={resolvedMessages.toolbar.alignCenter}
                        title={resolvedMessages.toolbar.alignCenter}
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    >
                        <AlignCenter size={16} aria-hidden="true" />
                    </MenuButton>
                    <MenuButton
                        active={editor.isActive({ textAlign: 'right' })}
                        aria-label={resolvedMessages.toolbar.alignRight}
                        title={resolvedMessages.toolbar.alignRight}
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    >
                        <AlignRight size={16} aria-hidden="true" />
                    </MenuButton>
                    <MenuButton
                        active={editor.isActive({ textAlign: 'justify' })}
                        aria-label={resolvedMessages.toolbar.alignJustify}
                        title={resolvedMessages.toolbar.alignJustify}
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    >
                        <AlignJustify size={16} aria-hidden="true" />
                    </MenuButton>
                </>
            ) : null}
            <span className="nlx-editor-toolbar-divider" aria-hidden="true" />
            <MenuButton
                aria-label={resolvedMessages.toolbar.undo}
                title={resolvedMessages.toolbar.undo}
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
            >
                <Undo2 size={16} aria-hidden="true" />
            </MenuButton>
            <MenuButton
                aria-label={resolvedMessages.toolbar.redo}
                title={resolvedMessages.toolbar.redo}
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
            >
                <Redo2 size={16} aria-hidden="true" />
            </MenuButton>
        </div>
    );
}
