import type { Editor as TiptapEditor } from '@tiptap/react';
import { Check, ChevronDown, Palette, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { DEFAULT_EDITOR_LOCALE, resolveEditorMessages, type EditorLocale } from '../../i18n';
import {
    BACKGROUND_COLORS,
    TEXT_COLORS,
    getColorLabel,
    type ColorOption,
    type ColorSwatchRenderer,
} from '../color/colorPalette';
import { MenuButton } from '../components/MenuButton';
import { EDITOR_TOOLTIP_SCOPE_ATTRIBUTE, useEditorTooltipScopeId } from '../tooltip/TooltipTrigger';
import { usePopoverDismiss } from './usePopoverDismiss';

interface BubbleColorSectionProps {
    activeColor: string | undefined;
    editor: TiptapEditor;
    label: string;
    mode: 'text' | 'background';
    onPick: () => void;
    onSwatchKeyDown: (
        index: number,
        option: ColorOption,
        mode: 'text' | 'background',
        event: KeyboardEvent<HTMLButtonElement>,
    ) => void;
    options: ColorOption[];
    renderSwatch?: ColorSwatchRenderer;
    registerSwatch: (index: number, node: HTMLButtonElement | null) => void;
    startIndex: number;
    locale: EditorLocale;
}

function BubbleColorSection({
    activeColor,
    editor,
    label,
    mode,
    onPick,
    onSwatchKeyDown,
    options,
    renderSwatch,
    registerSwatch,
    startIndex,
    locale,
}: BubbleColorSectionProps) {
    return (
        <span className="nlx-editor-bubble-color-section" role="group" aria-label={label}>
            <span className="nlx-editor-bubble-color-section-label" aria-hidden="true">
                {label}
            </span>
            <span className="nlx-editor-color-grid nlx-editor-bubble-color-grid">
                {options.map((option, index) => {
                    const swatchIndex = startIndex + index;
                    const active = option.value !== null && activeColor === option.value;
                    const optionLabel = getColorLabel(option, locale);

                    return (
                        <button
                            key={`${mode}-${option.value ?? 'clear'}`}
                            ref={(node) => registerSwatch(swatchIndex, node)}
                            type="button"
                            role="menuitemradio"
                            aria-checked={active}
                            tabIndex={active || (swatchIndex === 0 && index === 0) ? 0 : -1}
                            className={[
                                'nlx-editor-color-swatch',
                                'nlx-editor-bubble-color-swatch',
                                active ? 'nlx-editor-color-swatch-active' : '',
                                option.value ? '' : 'nlx-editor-bubble-color-swatch-clear',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-label={optionLabel}
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
                            onKeyDown={(event) => onSwatchKeyDown(swatchIndex, option, mode, event)}
                        >
                            {renderSwatch ? (
                                renderSwatch({
                                    active,
                                    label: optionLabel,
                                    mode,
                                    option,
                                })
                            ) : option.value ? (
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
    textColors?: ColorOption[];
    backgroundColors?: ColorOption[];
    renderSwatch?: ColorSwatchRenderer;
}

export function BubbleColorPicker({
    editor,
    locale = DEFAULT_EDITOR_LOCALE,
    open: controlledOpen,
    onOpenChange,
    allowTextColor = true,
    allowBackgroundColor = true,
    textColors,
    backgroundColors,
    renderSwatch,
}: BubbleColorPickerProps) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLSpanElement | null>(null);
    const swatchRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const pendingFocusIndexRef = useRef<number | null>(null);
    const popoverId = useId();
    const tooltipScopeId = useEditorTooltipScopeId();
    const messages = resolveEditorMessages(locale);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const textColor = editor.getAttributes('textStyle').color as string | undefined;
    const backgroundColor = editor.getAttributes('highlight').color as string | undefined;
    const textOptions = textColors ?? TEXT_COLORS;
    const backgroundOptions = backgroundColors ?? BACKGROUND_COLORS;
    const textStartIndex = 0;
    const backgroundStartIndex = allowTextColor ? textOptions.length : 0;
    const swatchCount =
        (allowTextColor ? textOptions.length : 0) +
        (allowBackgroundColor ? backgroundOptions.length : 0);
    const activeTextIndex = textOptions.findIndex(
        (option) => option.value !== null && textColor === option.value,
    );
    const activeBackgroundIndex = backgroundOptions.findIndex(
        (option) => option.value !== null && backgroundColor === option.value,
    );
    const activeIndex =
        allowTextColor && activeTextIndex >= 0
            ? activeTextIndex
            : allowBackgroundColor && activeBackgroundIndex >= 0
              ? backgroundStartIndex + activeBackgroundIndex
              : 0;
    const dismissRefs = useMemo(() => [triggerRef, popoverRef], []);

    const setOpen = useCallback(
        (nextOpen: boolean) => {
            if (controlledOpen === undefined) {
                setUncontrolledOpen(nextOpen);
            }

            onOpenChange?.(nextOpen);
        },
        [controlledOpen, onOpenChange],
    );

    usePopoverDismiss({
        open,
        onClose: () => setOpen(false),
        refs: dismissRefs,
    });

    const registerSwatch = useCallback((index: number, node: HTMLButtonElement | null) => {
        swatchRefs.current[index] = node;
    }, []);

    const focusSwatch = useCallback(
        (index: number) => {
            if (swatchCount === 0) {
                return;
            }

            const nextIndex = ((index % swatchCount) + swatchCount) % swatchCount;
            swatchRefs.current[nextIndex]?.focus();
        },
        [swatchCount],
    );

    useEffect(() => {
        if (!open || pendingFocusIndexRef.current === null) {
            return;
        }

        const nextIndex = pendingFocusIndexRef.current;
        pendingFocusIndexRef.current = null;
        focusSwatch(nextIndex);
    }, [focusSwatch, open]);

    const openAndFocus = (index: number) => {
        pendingFocusIndexRef.current = index;
        setOpen(true);
    };

    const applyColor = (option: ColorOption, mode: 'text' | 'background') => {
        if (mode === 'text') {
            if (option.value) {
                editor.chain().focus().setColor(option.value).run();
            } else {
                editor.chain().focus().unsetColor().run();
            }
        } else if (option.value) {
            editor.chain().focus().setHighlight({ color: option.value }).run();
        } else {
            editor.chain().focus().unsetHighlight().run();
        }
        setOpen(false);
    };

    const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
            return;
        }

        event.preventDefault();
        if (open) {
            focusSwatch(event.key === 'ArrowDown' ? activeIndex : swatchCount - 1);
            return;
        }

        openAndFocus(event.key === 'ArrowDown' ? activeIndex : swatchCount - 1);
    };

    const onSwatchKeyDown = (
        index: number,
        option: ColorOption,
        mode: 'text' | 'background',
        event: KeyboardEvent<HTMLButtonElement>,
    ) => {
        const columnCount = 5;
        const keyToOffset: Record<string, number | undefined> = {
            ArrowDown: columnCount,
            ArrowUp: -columnCount,
            ArrowRight: 1,
            ArrowLeft: -1,
        };
        const offset = keyToOffset[event.key];

        if (offset !== undefined) {
            event.preventDefault();
            focusSwatch(index + offset);
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            focusSwatch(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            focusSwatch(swatchCount - 1);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            applyColor(option, mode);
            triggerRef.current?.focus();
        }
    };

    return (
        <span
            className="nlx-editor-popover-host nlx-editor-tooltip-host"
            data-popover-open={open ? 'true' : undefined}
            data-nameless-editor-tooltip={messages.toolbar.colors}
            {...{ [EDITOR_TOOLTIP_SCOPE_ATTRIBUTE]: tooltipScopeId ?? undefined }}
        >
            <MenuButton
                ref={triggerRef}
                active={open || Boolean(textColor) || Boolean(backgroundColor)}
                withText
                className="nlx-editor-bubble-menu-select-trigger"
                aria-label={messages.toolbar.colors}
                aria-controls={open ? popoverId : undefined}
                aria-expanded={open}
                aria-haspopup="menu"
                data-nameless-editor-bubble-color-picker-trigger="true"
                onClick={() => setOpen(!open)}
                onKeyDown={onTriggerKeyDown}
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
                    id={popoverId}
                    ref={popoverRef}
                    role="menu"
                    aria-label={messages.toolbar.colors}
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
                            onSwatchKeyDown={onSwatchKeyDown}
                            options={textOptions}
                            renderSwatch={renderSwatch}
                            registerSwatch={registerSwatch}
                            startIndex={textStartIndex}
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
                            onSwatchKeyDown={onSwatchKeyDown}
                            options={backgroundOptions}
                            renderSwatch={renderSwatch}
                            registerSwatch={registerSwatch}
                            startIndex={backgroundStartIndex}
                            onPick={() => setOpen(false)}
                        />
                    ) : null}
                </span>
            ) : null}
        </span>
    );
}
