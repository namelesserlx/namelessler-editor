import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Code2,
    Heading1,
    Heading2,
    Heading3,
    Italic,
    Link2,
    Pilcrow,
    Quote,
    Strikethrough,
    Underline,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import type { EditorFeatureFlags } from '../core/createEditorExtensions';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../i18n';
import { sanitizeUrl } from '../security/urlPolicy';
import { BubbleColorPicker } from './BubbleColorPicker';
import { BubbleMenuSelect } from './BubbleMenuSelect';
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
    customSections?: Array<{
        key: string;
        placement: 'start' | 'end';
        render: (editor: TiptapEditor) => ReactNode;
    }>;
}

function enabled(features: Partial<EditorFeatureFlags> | undefined, key: keyof EditorFeatureFlags) {
    return features?.[key] ?? true;
}

type BubblePopover = 'style' | 'align' | 'link' | 'colors';

function normalizeHref(input: string): string | null {
    const value = input.trim();
    if (!value) {
        return null;
    }

    const withProtocol =
        value.startsWith('/') || value.startsWith('#') || /^[a-z][a-z0-9+.-]*:/iu.test(value)
            ? value
            : `https://${value}`;

    return sanitizeUrl(withProtocol, {
        allowedProtocols: ['http:', 'https:', 'mailto:'],
        allowRelativeUrls: true,
    });
}

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
    customSections,
}: DefaultBubbleMenuProps) {
    useEditorSnapshot(editor, { update: false });
    const messages = resolveEditorMessages(locale);
    const { from, to } = editor.state.selection;
    const selectionKey = `${from}:${to}`;
    const [activePopover, setActivePopover] = useState<BubblePopover | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const lastSelectionRectRef = useRef<DOMRect | null>(null);
    const allowTextColor = enabled(features, 'color') && colorPicker;
    const allowBackgroundColor = enabled(features, 'highlight') && colorPicker;
    const showColors = allowTextColor || allowBackgroundColor;
    const isOverlayOpen = activePopover !== null;

    useEffect(() => {
        setActivePopover((current) => (current === 'link' ? current : null));
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

    const getSelectionRect = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            return null;
        }

        return rect;
    };

    const closeLinkPanel = () => {
        setActivePopover((current) => (current === 'link' ? null : current));
        setLinkUrl('');
    };

    const openLinkPanel = () => {
        setLinkUrl((editor.getAttributes('link').href as string | undefined) ?? '');
        setActivePopover('link');
    };

    const applyLink = () => {
        const safeHref = normalizeHref(linkUrl);
        if (!safeHref) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            closeLinkPanel();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: safeHref }).run();
        closeLinkPanel();
    };

    const currentBlockType = editor.isActive('heading', { level: 1 })
        ? 'heading-1'
        : editor.isActive('heading', { level: 2 })
          ? 'heading-2'
          : editor.isActive('heading', { level: 3 })
            ? 'heading-3'
            : 'paragraph';
    const currentBlockLabel =
        currentBlockType === 'heading-1'
            ? messages.toolbar.heading1
            : currentBlockType === 'heading-2'
              ? messages.toolbar.heading2
              : currentBlockType === 'heading-3'
                ? messages.toolbar.heading3
                : messages.toolbar.paragraph;
    const currentAlign = editor.isActive({ textAlign: 'center' })
        ? 'center'
        : editor.isActive({ textAlign: 'right' })
          ? 'right'
          : 'left';
    const currentAlignLabel =
        currentAlign === 'center'
            ? messages.toolbar.alignCenter
            : currentAlign === 'right'
              ? messages.toolbar.alignRight
              : messages.toolbar.alignLeft;

    const menuStyle = zIndex === undefined ? undefined : ({ zIndex } satisfies CSSProperties);
    const startSections = customSections?.filter((s) => s.placement === 'start') ?? [];
    const endSections = customSections?.filter((s) => s.placement === 'end') ?? [];

    return (
        <BubbleMenu
            editor={editor}
            className="nlx-editor-bubble-menu"
            data-nameless-editor-bubble-menu="true"
            style={menuStyle}
            getReferencedVirtualElement={() => {
                if (!isOverlayOpen || !lastSelectionRectRef.current) {
                    return null;
                }

                const { x, y, width, height } = lastSelectionRectRef.current;
                return {
                    getBoundingClientRect: () => new DOMRect(x, y, width, height),
                    contextElement: editor.view.dom,
                };
            }}
            shouldShow={(context) => {
                const { state, from: currentFrom, to: currentTo } = context;
                const { selection } = state;

                if (selection.empty || currentFrom === currentTo) {
                    return isOverlayOpen && Boolean(lastSelectionRectRef.current);
                }

                const canShow = (shouldShow ?? defaultBubbleMenuShouldShow)({
                    editor,
                    state,
                    from: currentFrom,
                    to: currentTo,
                });

                if (!canShow) {
                    return false;
                }

                const selectionRect = getSelectionRect();
                if (selectionRect) {
                    lastSelectionRectRef.current = selectionRect;
                }

                return true;
            }}
        >
            <div className="nlx-editor-bubble-menu-content">
                {startSections.map((section) => (
                    <span key={section.key} className="nlx-editor-menu-section">
                        {section.render(editor)}
                    </span>
                ))}
                <span className="nlx-editor-menu-section">
                    <BubbleMenuSelect
                        ariaLabel={currentBlockLabel}
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
                                icon: <Pilcrow size={14} aria-hidden="true" />,
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
                                icon: <Heading1 size={14} aria-hidden="true" />,
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
                                icon: <Heading2 size={14} aria-hidden="true" />,
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
                                icon: <Heading3 size={14} aria-hidden="true" />,
                                dataAttribute: {
                                    name: 'data-nameless-editor-style-option',
                                    value: 'heading-3',
                                },
                                onSelect: () =>
                                    runCommand(() =>
                                        editor.chain().focus().toggleHeading({ level: 3 }).run(),
                                    ),
                            },
                        ]}
                    >
                        <span className="nlx-editor-bubble-menu-select-label">
                            {currentBlockLabel}
                        </span>
                    </BubbleMenuSelect>
                    {enabled(features, 'textAlign') ? (
                        <>
                            <span className="nlx-editor-menu-divider" aria-hidden="true" />
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
                                        icon: <AlignLeft size={14} aria-hidden="true" />,
                                        dataAttribute: {
                                            name: 'data-nameless-editor-align-option',
                                            value: 'left',
                                        },
                                        onSelect: () =>
                                            runCommand(() =>
                                                editor.chain().focus().setTextAlign('left').run(),
                                            ),
                                    },
                                    {
                                        key: 'center',
                                        label: messages.toolbar.alignCenter,
                                        active: currentAlign === 'center',
                                        icon: <AlignCenter size={14} aria-hidden="true" />,
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
                                        icon: <AlignRight size={14} aria-hidden="true" />,
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
                                {currentAlign === 'center' ? (
                                    <AlignCenter size={16} aria-hidden="true" />
                                ) : currentAlign === 'right' ? (
                                    <AlignRight size={16} aria-hidden="true" />
                                ) : (
                                    <AlignLeft size={16} aria-hidden="true" />
                                )}
                            </BubbleMenuSelect>
                        </>
                    ) : null}
                </span>

                <span className="nlx-editor-menu-divider" aria-hidden="true" />

                <span className="nlx-editor-menu-section">
                    <TooltipMenuButton
                        active={editor.isActive('bold')}
                        label={messages.toolbar.bold}
                        onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
                    >
                        <Bold size={14} aria-hidden="true" />
                    </TooltipMenuButton>
                    <TooltipMenuButton
                        active={editor.isActive('strike')}
                        label={messages.toolbar.strike}
                        onClick={() =>
                            runCommand(() => editor.chain().focus().toggleStrike().run())
                        }
                    >
                        <Strikethrough size={14} aria-hidden="true" />
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
                </span>

                <span className="nlx-editor-menu-divider" aria-hidden="true" />

                <span className="nlx-editor-menu-section">
                    {enabled(features, 'links') && linkPopover ? (
                        <TooltipMenuButton
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
                            <Link2 size={14} aria-hidden="true" />
                        </TooltipMenuButton>
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

                {showColors ? (
                    <>
                        <span className="nlx-editor-menu-divider" aria-hidden="true" />
                        <span className="nlx-editor-menu-section">
                            <BubbleColorPicker
                                editor={editor}
                                locale={locale}
                                open={activePopover === 'colors'}
                                onOpenChange={setPopoverOpen('colors')}
                                allowTextColor={allowTextColor}
                                allowBackgroundColor={allowBackgroundColor}
                            />
                        </span>
                    </>
                ) : null}
                {endSections.map((section) => (
                    <React.Fragment key={section.key}>
                        <span className="nlx-editor-menu-divider" aria-hidden="true" />
                        <span className="nlx-editor-menu-section">
                            {section.render(editor)}
                        </span>
                    </React.Fragment>
                ))}
            </div>
            {activePopover === 'link' ? (
                <div
                    className="nlx-editor-bubble-link-panel"
                    data-nameless-editor-bubble-link-panel="true"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <input
                        autoFocus
                        data-nameless-editor-link-input="true"
                        className="nlx-editor-input"
                        value={linkUrl}
                        placeholder={messages.linkPopover.urlPlaceholder}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                applyLink();
                            }
                            if (event.key === 'Escape') {
                                closeLinkPanel();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="nlx-editor-popover-action"
                        data-nameless-editor-link-save="true"
                        data-nameless-editor-link-confirm="true"
                        onClick={applyLink}
                    >
                        {messages.linkPopover.save}
                    </button>
                    <button
                        type="button"
                        className="nlx-editor-popover-action nlx-editor-popover-action-secondary"
                        data-nameless-editor-link-cancel="true"
                        onClick={closeLinkPanel}
                    >
                        {messages.linkPopover.cancel}
                    </button>
                </div>
            ) : null}
        </BubbleMenu>
    );
}
