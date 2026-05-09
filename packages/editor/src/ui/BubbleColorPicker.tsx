import type { Editor as TiptapEditor } from '@tiptap/react';
import { Check, ChevronDown, Palette, X } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../i18n';
import { BACKGROUND_COLORS, TEXT_COLORS, getColorLabels, type ColorOption } from './colorPalette';
import { MenuButton } from './MenuButton';

interface BubbleColorSectionProps {
    activeColor: string | undefined;
    editor: TiptapEditor;
    label: string;
    mode: 'text' | 'background';
    onPick: () => void;
    options: ColorOption[];
    locale: EditorLocale;
}

function BubbleColorSection({
    activeColor,
    editor,
    label,
    mode,
    onPick,
    options,
    locale,
}: BubbleColorSectionProps) {
    const colorLabels = getColorLabels(locale);

    return (
        <span className="nlx-editor-bubble-color-section">
            <span className="nlx-editor-bubble-color-section-label">{label}</span>
            <span className="nlx-editor-color-grid nlx-editor-bubble-color-grid">
                {options.map((option) => {
                    const active = option.value !== null && activeColor === option.value;

                    return (
                        <button
                            key={`${mode}-${option.value ?? 'clear'}`}
                            type="button"
                            className={[
                                'nlx-editor-color-swatch',
                                'nlx-editor-bubble-color-swatch',
                                active ? 'nlx-editor-color-swatch-active' : '',
                                option.value ? '' : 'nlx-editor-bubble-color-swatch-clear',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-label={colorLabels[option.key]}
                            data-nameless-editor-bubble-color-swatch-mode={mode}
                            data-color-key={option.key}
                            style={
                                option.value
                                    ? {
                                          color: mode === 'text' ? option.value : undefined,
                                          backgroundColor:
                                              mode === 'background' ? option.value : undefined,
                                      }
                                    : undefined
                            }
                            onClick={() => {
                                if (mode === 'text') {
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
                                onPick();
                            }}
                        >
                            {option.value ? (
                                mode === 'text' ? (
                                    <span className="nlx-editor-color-swatch-letter">A</span>
                                ) : active ? (
                                    <Check
                                        size={11}
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                        className="nlx-editor-color-swatch-check"
                                    />
                                ) : null
                            ) : (
                                <X size={12} aria-hidden="true" />
                            )}
                        </button>
                    );
                })}
            </span>
        </span>
    );
}

export interface BubbleColorPickerProps {
    editor: TiptapEditor;
    locale?: EditorLocale;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    allowTextColor?: boolean;
    allowBackgroundColor?: boolean;
}

export function BubbleColorPicker({
    editor,
    locale = DEFAULT_EDITOR_LOCALE,
    open: controlledOpen,
    onOpenChange,
    allowTextColor = true,
    allowBackgroundColor = true,
}: BubbleColorPickerProps) {
    const messages = resolveEditorMessages(locale);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const textColor = editor.getAttributes('textStyle').color as string | undefined;
    const backgroundColor = editor.getAttributes('highlight').color as string | undefined;

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
            data-tooltip={messages.toolbar.colors}
        >
            <MenuButton
                active={open || Boolean(textColor) || Boolean(backgroundColor)}
                withText
                className="nlx-editor-bubble-menu-select-trigger"
                aria-label={messages.toolbar.colors}
                data-nameless-editor-bubble-color-picker-trigger="true"
                onClick={() => setOpen(!open)}
            >
                <Palette size={16} aria-hidden="true" />
                <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className="nlx-editor-bubble-menu-select-trigger-chevron"
                />
            </MenuButton>
            {open ? (
                <span
                    className="nlx-editor-popover nlx-editor-bubble-color-popover"
                    data-nameless-editor-bubble-color-picker="true"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    {allowTextColor ? (
                        <BubbleColorSection
                            activeColor={textColor}
                            editor={editor}
                            label={messages.toolbar.textColor}
                            mode="text"
                            locale={locale}
                            options={TEXT_COLORS}
                            onPick={() => setOpen(false)}
                        />
                    ) : null}
                    {allowTextColor && allowBackgroundColor ? (
                        <span className="nlx-editor-bubble-color-divider" aria-hidden="true" />
                    ) : null}
                    {allowBackgroundColor ? (
                        <BubbleColorSection
                            activeColor={backgroundColor}
                            editor={editor}
                            label={messages.toolbar.backgroundColor}
                            mode="background"
                            locale={locale}
                            options={BACKGROUND_COLORS}
                            onPick={() => setOpen(false)}
                        />
                    ) : null}
                </span>
            ) : null}
        </span>
    );
}
