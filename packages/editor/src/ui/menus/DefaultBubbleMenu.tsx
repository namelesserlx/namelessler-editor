import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import type { EditorFeatureFlags } from '../../core/createEditorExtensions';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../../i18n';
import { sanitizeUrl } from '../../security/urlPolicy';
import type { EditorBubbleMenuShouldShow, EditorColorPickerConfig } from '../types';
import { resolveEditorColorPickerOptions } from '../types';
import { useEditorSnapshot } from '../hooks/useEditorSnapshot';
import { EDITOR_TOOLTIP_SCOPE_ATTRIBUTE, useEditorTooltipScopeId } from '../tooltip/TooltipTrigger';
import {
    resolveBubbleMenuCommands,
    type BubbleMenuCommand,
    type BubbleMenuCommandContext,
    type BubbleMenuCommandRegistry,
    type BubbleMenuPopover,
} from './bubbleMenuCommands';

export interface DefaultBubbleMenuProps {
    editor: TiptapEditor;
    features?: Partial<EditorFeatureFlags>;
    locale?: EditorLocale;
    linkPopover?: boolean;
    colorPicker?: EditorColorPickerConfig;
    zIndex?: number;
    shouldShow?: EditorBubbleMenuShouldShow | null;
    commands?: BubbleMenuCommandRegistry;
}

interface BubbleMenuGroup {
    id: string;
    nodes: Array<{ id: string; node: ReactNode }>;
}

function pushBubbleMenuNode(
    groups: BubbleMenuGroup[],
    command: BubbleMenuCommand,
    node: ReactNode,
) {
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
    commands,
}: DefaultBubbleMenuProps) {
    const snapshotVersion = useEditorSnapshot(editor, { update: false });
    const messages = resolveEditorMessages(locale);
    const resolvedColorPicker = resolveEditorColorPickerOptions(colorPicker);
    const tooltipScopeId = useEditorTooltipScopeId();
    const { from, to } = editor.state.selection;
    const selectionKey = `${from}:${to}`;
    const [activePopover, setActivePopover] = useState<BubbleMenuPopover | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const lastSelectionRectRef = useRef<DOMRect | null>(null);
    const isOverlayOpen = activePopover !== null;

    useEffect(() => {
        setActivePopover((current) => (current === 'link' ? current : null));
    }, [selectionKey]);

    const closePopovers = useCallback(() => {
        setActivePopover(null);
        setLinkUrl('');
    }, []);

    const setPopoverOpen = useCallback(
        (popover: BubbleMenuPopover) => (open: boolean) => {
            setActivePopover((current) => {
                if (open) {
                    return popover;
                }

                return current === popover ? null : current;
            });
        },
        [],
    );

    const runCommand = useCallback(
        (command: () => void) => {
            closePopovers();
            command();
        },
        [closePopovers],
    );

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

    const closeLinkPanel = useCallback(() => {
        setActivePopover((current) => (current === 'link' ? null : current));
        setLinkUrl('');
    }, []);

    const openLinkPanel = useCallback(() => {
        setLinkUrl((editor.getAttributes('link').href as string | undefined) ?? '');
        setActivePopover('link');
    }, [editor]);

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

    const currentBlockType: BubbleMenuCommandContext['currentBlockType'] = editor.isActive(
        'heading',
        { level: 1 },
    )
        ? 'heading-1'
        : editor.isActive('heading', { level: 2 })
          ? 'heading-2'
          : editor.isActive('heading', { level: 3 })
            ? 'heading-3'
            : editor.isActive('heading', { level: 4 })
              ? 'heading-4'
              : 'paragraph';
    const currentBlockLabel =
        currentBlockType === 'heading-1'
            ? messages.toolbar.heading1
            : currentBlockType === 'heading-2'
              ? messages.toolbar.heading2
              : currentBlockType === 'heading-3'
                ? messages.toolbar.heading3
                : currentBlockType === 'heading-4'
                  ? messages.toolbar.heading4
                  : messages.toolbar.paragraph;
    const currentAlign: BubbleMenuCommandContext['currentAlign'] = editor.isActive({
        textAlign: 'center',
    })
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

    const commandContext = useMemo<BubbleMenuCommandContext>(
        () => ({
            activePopover,
            closeLinkPanel,
            closePopovers,
            colorPicker: resolvedColorPicker,
            currentAlign,
            currentAlignLabel,
            currentBlockLabel,
            currentBlockType,
            editor,
            features,
            linkPopover,
            locale,
            messages,
            openLinkPanel,
            runCommand,
            selectionKey,
            setPopoverOpen,
            snapshotVersion,
        }),
        [
            activePopover,
            closeLinkPanel,
            closePopovers,
            currentAlign,
            currentAlignLabel,
            currentBlockLabel,
            currentBlockType,
            editor,
            features,
            linkPopover,
            locale,
            messages,
            openLinkPanel,
            resolvedColorPicker,
            runCommand,
            selectionKey,
            setPopoverOpen,
            snapshotVersion,
        ],
    );

    const renderedGroups = useMemo(() => {
        const groups: BubbleMenuGroup[] = [];

        for (const command of resolveBubbleMenuCommands(commands, commandContext)) {
            const node = command.render(commandContext);
            if (node === null || node === undefined || node === false) {
                continue;
            }

            pushBubbleMenuNode(groups, command, node);
        }

        return groups;
    }, [commandContext, commands]);

    const menuStyle = zIndex === undefined ? undefined : ({ zIndex } satisfies CSSProperties);
    return (
        <BubbleMenu
            editor={editor}
            className="nlx-editor-bubble-menu"
            data-nameless-editor-bubble-menu="true"
            {...{ [EDITOR_TOOLTIP_SCOPE_ATTRIBUTE]: tooltipScopeId ?? undefined }}
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
                {renderedGroups.map((group, index) => (
                    <Fragment key={`${group.id}-${index}`}>
                        {index > 0 ? (
                            <span className="nlx-editor-menu-divider" aria-hidden="true" />
                        ) : null}
                        <span
                            className="nlx-editor-menu-section"
                            data-nameless-editor-bubble-menu-group={group.id}
                        >
                            {group.nodes.map((item) => (
                                <Fragment key={item.id}>{item.node}</Fragment>
                            ))}
                        </span>
                    </Fragment>
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
