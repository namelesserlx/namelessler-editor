import { useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Highlighter, Palette, X } from 'lucide-react';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../i18n';
import { MenuButton } from './MenuButton';
import { BACKGROUND_COLORS, TEXT_COLORS, getColorLabels } from './colorPalette';

export interface ColorPickerProps {
    editor: TiptapEditor;
    locale?: EditorLocale;
    mode: 'text' | 'background';
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ColorPicker({
    editor,
    locale = DEFAULT_EDITOR_LOCALE,
    mode,
    open: controlledOpen,
    onOpenChange,
}: ColorPickerProps) {
    const messages = resolveEditorMessages(locale);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const isTextMode = mode === 'text';
    const options = isTextMode ? TEXT_COLORS : BACKGROUND_COLORS;
    const activeColor = isTextMode
        ? (editor.getAttributes('textStyle').color as string | undefined)
        : (editor.getAttributes('highlight').color as string | undefined);
    const label = isTextMode ? messages.toolbar.textColor : messages.toolbar.backgroundColor;
    const colorLabels = getColorLabels(locale);

    const setOpen = (nextOpen: boolean) => {
        if (controlledOpen === undefined) {
            setUncontrolledOpen(nextOpen);
        }

        onOpenChange?.(nextOpen);
    };

    return (
        <span
            className="nlx-editor-popover-host nlx-editor-tooltip-host"
            data-popover-open={open ? 'true' : undefined}
            data-tooltip={label}
        >
            <MenuButton
                active={open || Boolean(activeColor)}
                aria-label={label}
                onClick={() => setOpen(!open)}
            >
                {isTextMode ? (
                    <Palette size={16} aria-hidden="true" />
                ) : (
                    <Highlighter size={16} aria-hidden="true" />
                )}
            </MenuButton>
            {open ? (
                <span
                    className="nlx-editor-popover nlx-editor-color-popover"
                    data-nameless-editor-color-picker="true"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <span className="nlx-editor-popover-label">{label}</span>
                    <span className="nlx-editor-color-grid">
                        {options.map((option) => {
                            const active = option.value !== null && activeColor === option.value;
                            const optionLabel = colorLabels[option.key];

                            return (
                                <button
                                    key={option.value ?? 'clear'}
                                    type="button"
                                    className={[
                                        'nlx-editor-color-swatch',
                                        active ? 'nlx-editor-color-swatch-active' : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    aria-label={optionLabel}
                                    title={optionLabel}
                                    style={
                                        option.value
                                            ? {
                                                  color: isTextMode ? option.value : undefined,
                                                  backgroundColor: isTextMode
                                                      ? undefined
                                                      : option.value,
                                              }
                                            : undefined
                                    }
                                    onClick={() => {
                                        if (isTextMode) {
                                            if (option.value) {
                                                editor.chain().focus().setColor(option.value).run();
                                            } else {
                                                editor.chain().focus().unsetColor().run();
                                            }
                                        } else if (option.value) {
                                            editor
                                                .chain()
                                                .focus()
                                                .setHighlight({ color: option.value })
                                                .run();
                                        } else {
                                            editor.chain().focus().unsetHighlight().run();
                                        }
                                        setOpen(false);
                                    }}
                                >
                                    {option.value ? (
                                        <span>A</span>
                                    ) : (
                                        <X size={12} aria-hidden="true" />
                                    )}
                                </button>
                            );
                        })}
                    </span>
                </span>
            ) : null}
        </span>
    );
}
