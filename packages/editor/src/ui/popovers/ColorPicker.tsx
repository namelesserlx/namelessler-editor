import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Highlighter, Palette, X } from 'lucide-react';
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

export interface ColorPickerProps {
    editor: TiptapEditor;
    locale?: EditorLocale;
    mode: 'text' | 'background';
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    colors?: ColorOption[];
    renderSwatch?: ColorSwatchRenderer;
}

export function ColorPicker({
    editor,
    locale = DEFAULT_EDITOR_LOCALE,
    mode,
    open: controlledOpen,
    onOpenChange,
    colors,
    renderSwatch,
}: ColorPickerProps) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLSpanElement | null>(null);
    const swatchRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const pendingFocusIndexRef = useRef<number | null>(null);
    const popoverId = useId();
    const tooltipScopeId = useEditorTooltipScopeId();
    const messages = resolveEditorMessages(locale);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const isTextMode = mode === 'text';
    const options = colors ?? (isTextMode ? TEXT_COLORS : BACKGROUND_COLORS);
    const activeColor = isTextMode
        ? (editor.getAttributes('textStyle').color as string | undefined)
        : (editor.getAttributes('highlight').color as string | undefined);
    const label = isTextMode ? messages.toolbar.textColor : messages.toolbar.backgroundColor;
    const activeIndex = Math.max(
        0,
        options.findIndex((option) => option.value !== null && activeColor === option.value),
    );
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

    const focusSwatch = useCallback(
        (index: number) => {
            const optionCount = options.length;
            if (optionCount === 0) {
                return;
            }

            const nextIndex = ((index % optionCount) + optionCount) % optionCount;
            swatchRefs.current[nextIndex]?.focus();
        },
        [options.length],
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

    const applyColor = (value: string | null) => {
        if (isTextMode) {
            if (value) {
                editor.chain().focus().setColor(value).run();
            } else {
                editor.chain().focus().unsetColor().run();
            }
        } else if (value) {
            editor.chain().focus().setHighlight({ color: value }).run();
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
            focusSwatch(event.key === 'ArrowDown' ? activeIndex : options.length - 1);
            return;
        }

        openAndFocus(event.key === 'ArrowDown' ? activeIndex : options.length - 1);
    };

    const onSwatchKeyDown = (
        index: number,
        value: string | null,
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
            focusSwatch(options.length - 1);
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
            applyColor(value);
            triggerRef.current?.focus();
        }
    };

    return (
        <span
            className="nlx-editor-popover-host nlx-editor-tooltip-host"
            data-popover-open={open ? 'true' : undefined}
            data-nameless-editor-tooltip={label}
            {...{ [EDITOR_TOOLTIP_SCOPE_ATTRIBUTE]: tooltipScopeId ?? undefined }}
        >
            <MenuButton
                ref={triggerRef}
                active={open || Boolean(activeColor)}
                aria-label={label}
                aria-controls={open ? popoverId : undefined}
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen(!open)}
                onKeyDown={onTriggerKeyDown}
            >
                {isTextMode ? (
                    <Palette size={16} aria-hidden="true" />
                ) : (
                    <Highlighter size={16} aria-hidden="true" />
                )}
            </MenuButton>
            {open ? (
                <span
                    id={popoverId}
                    ref={popoverRef}
                    role="menu"
                    aria-label={label}
                    className="nlx-editor-popover nlx-editor-color-popover"
                    data-nameless-editor-color-picker="true"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <span className="nlx-editor-popover-label">{label}</span>
                    <span className="nlx-editor-color-grid">
                        {options.map((option, index) => {
                            const active = option.value !== null && activeColor === option.value;
                            const optionLabel = getColorLabel(option, locale);

                            return (
                                <button
                                    key={`${option.key}-${option.value ?? 'clear'}`}
                                    ref={(node) => {
                                        swatchRefs.current[index] = node;
                                    }}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={active}
                                    tabIndex={active || (activeIndex === 0 && index === 0) ? 0 : -1}
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
                                    onClick={() => applyColor(option.value)}
                                    onKeyDown={(event) =>
                                        onSwatchKeyDown(index, option.value, event)
                                    }
                                >
                                    {renderSwatch ? (
                                        renderSwatch({
                                            active,
                                            label: optionLabel,
                                            mode,
                                            option,
                                        })
                                    ) : option.value ? (
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
