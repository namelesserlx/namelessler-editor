import { useEffect, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Link2, Unlink } from 'lucide-react';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../i18n';
import { sanitizeUrl } from '../security/urlPolicy';
import { MenuButton } from './MenuButton';

export interface LinkPopoverProps {
    editor: TiptapEditor;
    locale?: EditorLocale;
    selectionKey?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
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

export function LinkPopover({
    editor,
    locale = DEFAULT_EDITOR_LOCALE,
    selectionKey,
    open: controlledOpen,
    onOpenChange,
}: LinkPopoverProps) {
    const messages = resolveEditorMessages(locale);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const [href, setHref] = useState('');
    const openedSelectionKeyRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!open || !openedSelectionKeyRef.current) {
            return;
        }

        if (selectionKey !== openedSelectionKeyRef.current) {
            if (controlledOpen === undefined) {
                setUncontrolledOpen(false);
            }
            onOpenChange?.(false);
            setHref('');
            openedSelectionKeyRef.current = undefined;
        }
    }, [controlledOpen, onOpenChange, open, selectionKey]);

    const closePopover = () => {
        if (controlledOpen === undefined) {
            setUncontrolledOpen(false);
        }
        onOpenChange?.(false);
        setHref('');
        openedSelectionKeyRef.current = undefined;
    };

    const openPopover = () => {
        openedSelectionKeyRef.current = selectionKey;
        setHref((editor.getAttributes('link').href as string | undefined) ?? '');
        if (controlledOpen === undefined) {
            setUncontrolledOpen(true);
        }
        onOpenChange?.(true);
    };

    const applyLink = () => {
        const safeHref = normalizeHref(href);
        if (!safeHref) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            closePopover();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: safeHref }).run();
        closePopover();
    };

    return (
        <span
            className="nlx-editor-popover-host nlx-editor-tooltip-host"
            data-popover-open={open ? 'true' : undefined}
            data-tooltip={messages.toolbar.link}
        >
            <MenuButton
                active={editor.isActive('link') || open}
                aria-label={messages.toolbar.link}
                onClick={() => {
                    if (open) {
                        closePopover();
                        return;
                    }

                    openPopover();
                }}
            >
                <Link2 size={16} aria-hidden="true" />
            </MenuButton>
            {open ? (
                <span
                    className="nlx-editor-popover nlx-editor-link-popover"
                    data-nameless-editor-link-popover="true"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <input
                        data-nameless-editor-link-input="true"
                        className="nlx-editor-input"
                        value={href}
                        placeholder={messages.linkPopover.urlPlaceholder}
                        onChange={(event) => setHref(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                applyLink();
                            }
                            if (event.key === 'Escape') {
                                closePopover();
                                editor.chain().focus().run();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="nlx-editor-popover-action"
                        data-nameless-editor-link-save="true"
                        onClick={applyLink}
                    >
                        {messages.linkPopover.save}
                    </button>
                    <button
                        type="button"
                        className="nlx-editor-popover-action"
                        aria-label={messages.toolbar.unlink}
                        title={messages.toolbar.unlink}
                        onClick={() => {
                            editor.chain().focus().extendMarkRange('link').unsetLink().run();
                            closePopover();
                        }}
                    >
                        <Unlink size={14} aria-hidden="true" />
                    </button>
                </span>
            ) : null}
        </span>
    );
}
