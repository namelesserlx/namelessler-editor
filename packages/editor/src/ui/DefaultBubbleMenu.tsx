import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { Bold, Code2, Italic, Quote, Strikethrough, Underline } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import type { EditorFeatureFlags } from '../core/createEditorExtensions';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../i18n';
import { ColorPicker } from './ColorPicker';
import { LinkPopover } from './LinkPopover';
import { TooltipMenuButton } from './MenuButton';
import type { EditorBubbleMenuShouldShow } from './types';
import { useEditorSnapshot } from './useEditorSnapshot';

export interface DefaultBubbleMenuProps {
    editor: TiptapEditor;
    features?: Partial<EditorFeatureFlags>;
    locale?: EditorLocale;
    linkPopover?: boolean;
    colorPicker?: boolean;
    zIndex?: number;
    shouldShow?: EditorBubbleMenuShouldShow | null;
}

function enabled(features: Partial<EditorFeatureFlags> | undefined, key: keyof EditorFeatureFlags) {
    return features?.[key] ?? true;
}

type BubblePopover = 'link' | 'textColor' | 'backgroundColor';

export const defaultBubbleMenuShouldShow: EditorBubbleMenuShouldShow = ({
    editor,
    state,
    from,
    to,
}) => {
    const { selection } = state;

    if (!editor.isEditable || selection.empty || from === to) {
        return false;
    }

    if (selection instanceof NodeSelection || !(selection instanceof TextSelection)) {
        return false;
    }

    const parent = selection.$from.parent;
    return parent.type.spec.code !== true && parent.type.name !== 'codeBlockPro';
};

export function DefaultBubbleMenu({
    editor,
    features,
    locale = DEFAULT_EDITOR_LOCALE,
    linkPopover = true,
    colorPicker = true,
    zIndex,
    shouldShow,
}: DefaultBubbleMenuProps) {
    useEditorSnapshot(editor, { update: false });
    const messages = resolveEditorMessages(locale);
    const { from, to } = editor.state.selection;
    const selectionKey = `${from}:${to}`;
    const [activePopover, setActivePopover] = useState<BubblePopover | null>(null);

    useEffect(() => {
        setActivePopover(null);
    }, [selectionKey]);

    const setPopoverOpen = (popover: BubblePopover) => (open: boolean) => {
        setActivePopover((current) => {
            if (open) {
                return popover;
            }

            return current === popover ? null : current;
        });
    };

    const runCommand = (command: () => void) => {
        setActivePopover(null);
        command();
    };
    const menuStyle = zIndex === undefined ? undefined : ({ zIndex } satisfies CSSProperties);

    return (
        <BubbleMenu
            editor={editor}
            className="nlx-editor-bubble-menu"
            data-nameless-editor-bubble-menu="true"
            style={menuStyle}
            shouldShow={shouldShow ?? defaultBubbleMenuShouldShow}
        >
            <div className="nlx-editor-bubble-menu-content">
                <span className="nlx-editor-menu-section">
                    <TooltipMenuButton
                        active={editor.isActive('bold')}
                        label={messages.toolbar.bold}
                        onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
                    >
                        <Bold size={14} aria-hidden="true" />
                    </TooltipMenuButton>
                    <TooltipMenuButton
                        active={editor.isActive('italic')}
                        label={messages.toolbar.italic}
                        onClick={() =>
                            runCommand(() => editor.chain().focus().toggleItalic().run())
                        }
                    >
                        <Italic size={14} aria-hidden="true" />
                    </TooltipMenuButton>
                    {enabled(features, 'underline') ? (
                        <TooltipMenuButton
                            active={editor.isActive('underline')}
                            label={messages.toolbar.underline}
                            onClick={() =>
                                runCommand(() => editor.chain().focus().toggleUnderline().run())
                            }
                        >
                            <Underline size={14} aria-hidden="true" />
                        </TooltipMenuButton>
                    ) : null}
                    <TooltipMenuButton
                        active={editor.isActive('strike')}
                        label={messages.toolbar.strike}
                        onClick={() =>
                            runCommand(() => editor.chain().focus().toggleStrike().run())
                        }
                    >
                        <Strikethrough size={14} aria-hidden="true" />
                    </TooltipMenuButton>
                </span>

                <span className="nlx-editor-menu-divider" aria-hidden="true" />

                <span className="nlx-editor-menu-section">
                    {enabled(features, 'links') && linkPopover ? (
                        <LinkPopover
                            editor={editor}
                            locale={locale}
                            selectionKey={selectionKey}
                            open={activePopover === 'link'}
                            onOpenChange={setPopoverOpen('link')}
                        />
                    ) : null}
                    <TooltipMenuButton
                        active={editor.isActive('code')}
                        label={messages.toolbar.code}
                        onClick={() => runCommand(() => editor.chain().focus().toggleCode().run())}
                    >
                        <Code2 size={14} aria-hidden="true" />
                    </TooltipMenuButton>
                    <TooltipMenuButton
                        active={editor.isActive('blockquote')}
                        label={messages.toolbar.blockquote}
                        onClick={() =>
                            runCommand(() => editor.chain().focus().toggleBlockquote().run())
                        }
                    >
                        <Quote size={14} aria-hidden="true" />
                    </TooltipMenuButton>
                </span>

                {colorPicker ? (
                    <span className="nlx-editor-menu-divider" aria-hidden="true" />
                ) : null}

                <span className="nlx-editor-menu-section">
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
                </span>
            </div>
        </BubbleMenu>
    );
}
