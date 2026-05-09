import type { Editor as TiptapEditor } from '@tiptap/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../i18n';
import { TooltipMenuButton } from './MenuButton';
import { useEditorSnapshot } from './useEditorSnapshot';

export interface TableBubbleMenuProps {
    editor: TiptapEditor;
    locale?: EditorLocale;
    zIndex?: number;
}

function getTableWrapper(table: HTMLElement): HTMLElement {
    const wrapper = table.parentElement;
    return wrapper?.classList.contains('tableWrapper') ? wrapper : table;
}

function findSelectionTableDom(editor: TiptapEditor): HTMLElement | null {
    if (!editor.isActive('table')) return null;

    const { from } = editor.state.selection;
    const domAtPos = editor.view.domAtPos(from);
    const domNode = domAtPos.node;

    // domAtPos returns a Text node when cursor is inside text content.
    // Walk up from the node to find the nearest <table> element.
    let el: Node | null = domNode;
    while (el) {
        if (el instanceof HTMLElement && el.tagName === 'TABLE' && editor.view.dom.contains(el)) {
            return getTableWrapper(el);
        }
        el = el.parentElement;
    }

    return null;
}

function findHoveredTableDom(editor: TiptapEditor, target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) return null;

    const table = target.closest('table');
    if (!(table instanceof HTMLElement) || !editor.view.dom.contains(table)) return null;

    return getTableWrapper(table);
}

function containsTarget(element: HTMLElement | null, target: EventTarget | null): boolean {
    return target instanceof Node && Boolean(element?.contains(target));
}

export function TableBubbleMenu({
    editor,
    locale = DEFAULT_EDITOR_LOCALE,
    zIndex,
}: TableBubbleMenuProps) {
    useEditorSnapshot(editor, { update: false });
    const messages = resolveEditorMessages(locale);

    const [menuStyle, setMenuStyle] = useState<{ left: number; top: number } | null>(null);
    const hoveredTableRef = useRef<HTMLElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);

    const updatePositionForTable = useCallback((tableDom: HTMLElement | null) => {
        if (tableDom === null) {
            setMenuStyle((prev) => (prev === null ? prev : null));
            return;
        }

        const rect = tableDom.getBoundingClientRect();
        const left = rect.left + rect.width / 2;
        const top = rect.top - 8;

        setMenuStyle((prev) => {
            if (prev !== null && prev.left === left && prev.top === top) {
                return prev;
            }
            return { left, top };
        });
    }, []);

    const getActiveTableDom = useCallback(() => {
        const hoveredTable = hoveredTableRef.current;

        if (hoveredTable !== null && editor.view.dom.contains(hoveredTable)) {
            return hoveredTable;
        }

        hoveredTableRef.current = null;
        return findSelectionTableDom(editor);
    }, [editor]);

    const updatePosition = useCallback(() => {
        updatePositionForTable(getActiveTableDom());
    }, [getActiveTableDom, updatePositionForTable]);

    const clearHoveredTable = useCallback(() => {
        hoveredTableRef.current = null;
        updatePositionForTable(findSelectionTableDom(editor));
    }, [editor, updatePositionForTable]);

    // Sync position on every render (triggered by selection/content changes)
    useLayoutEffect(() => {
        updatePosition();
    });

    // Hovering a table should reveal the menu even before the editor selection moves into it.
    useEffect(() => {
        const editorDom = editor.view.dom;

        const onMouseMove = (event: MouseEvent) => {
            const tableDom = findHoveredTableDom(editor, event.target);
            if (tableDom === null) {
                if (!containsTarget(menuRef.current, event.target)) {
                    clearHoveredTable();
                }
                return;
            }

            hoveredTableRef.current = tableDom;
            updatePositionForTable(tableDom);
        };

        const onMouseLeave = (event: MouseEvent) => {
            if (containsTarget(menuRef.current, event.relatedTarget)) return;
            clearHoveredTable();
        };

        editorDom.addEventListener('mousemove', onMouseMove);
        editorDom.addEventListener('mouseleave', onMouseLeave);

        return () => {
            editorDom.removeEventListener('mousemove', onMouseMove);
            editorDom.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [clearHoveredTable, editor, updatePositionForTable]);

    // Listen for scroll and resize to keep position correct
    useEffect(() => {
        const onScroll = () => {
            if (rafRef.current !== null) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                updatePosition();
            });
        };

        const onResize = () => updatePosition();

        window.addEventListener('scroll', onScroll, { capture: true });
        window.addEventListener('resize', onResize);

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
            window.removeEventListener('scroll', onScroll, { capture: true });
            window.removeEventListener('resize', onResize);
        };
    }, [updatePosition]);

    if (menuStyle === null) return null;

    return createPortal(
        <div
            ref={menuRef}
            className="nlx-editor-table-bubble-menu"
            style={zIndex === undefined ? menuStyle : { ...menuStyle, zIndex }}
            onMouseLeave={(event) => {
                if (containsTarget(hoveredTableRef.current, event.relatedTarget)) return;
                clearHoveredTable();
            }}
        >
            <span className="nlx-editor-menu-section">
                <TooltipMenuButton
                    label={messages.tableMenu.addColumnBefore}
                    onClick={() => editor.chain().focus().addColumnBefore().run()}
                >
                    <ArrowLeft size={14} aria-hidden="true" />
                </TooltipMenuButton>
                <TooltipMenuButton
                    label={messages.tableMenu.addColumnAfter}
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                >
                    <ArrowRight size={14} aria-hidden="true" />
                </TooltipMenuButton>
                <TooltipMenuButton
                    label={messages.tableMenu.deleteColumn}
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                >
                    <Trash2 size={14} aria-hidden="true" />
                </TooltipMenuButton>
            </span>
            <span className="nlx-editor-menu-divider" aria-hidden="true" />
            <span className="nlx-editor-menu-section">
                <TooltipMenuButton
                    label={messages.tableMenu.addRowBefore}
                    onClick={() => editor.chain().focus().addRowBefore().run()}
                >
                    <ArrowUp size={14} aria-hidden="true" />
                </TooltipMenuButton>
                <TooltipMenuButton
                    label={messages.tableMenu.addRowAfter}
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                >
                    <ArrowDown size={14} aria-hidden="true" />
                </TooltipMenuButton>
                <TooltipMenuButton
                    label={messages.tableMenu.deleteRow}
                    onClick={() => editor.chain().focus().deleteRow().run()}
                >
                    <Trash2 size={14} aria-hidden="true" />
                </TooltipMenuButton>
            </span>
        </div>,
        document.body,
    );
}
