import { ChevronDown } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { MenuButton } from '../components/MenuButton';
import { EDITOR_TOOLTIP_SCOPE_ATTRIBUTE, useEditorTooltipScopeId } from '../tooltip/TooltipTrigger';
import { usePopoverDismiss } from './usePopoverDismiss';

interface BubbleMenuSelectDataAttribute {
    name: string;
    value: string;
}

export interface BubbleMenuSelectOption {
    key: string;
    label: string;
    icon?: ReactNode;
    active?: boolean;
    onSelect: () => void;
    dataAttribute?: BubbleMenuSelectDataAttribute;
}

export interface BubbleMenuSelectProps {
    ariaLabel: string;
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    tooltip?: string;
    triggerDataAttribute?: BubbleMenuSelectDataAttribute;
    options: BubbleMenuSelectOption[];
}

function toDataAttributes(attribute: BubbleMenuSelectDataAttribute | undefined) {
    if (!attribute) {
        return {};
    }

    return { [attribute.name]: attribute.value };
}

export function BubbleMenuSelect({
    ariaLabel,
    children,
    open = false,
    onOpenChange,
    tooltip,
    triggerDataAttribute,
    options,
}: BubbleMenuSelectProps) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLSpanElement | null>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const pendingFocusIndexRef = useRef<number | null>(null);
    const popoverId = useId();
    const tooltipScopeId = useEditorTooltipScopeId();
    const activeIndex = Math.max(
        0,
        options.findIndex((option) => option.active),
    );
    const dismissRefs = useMemo(() => [triggerRef, popoverRef], []);
    const hostClassName = ['nlx-editor-popover-host', tooltip ? 'nlx-editor-tooltip-host' : '']
        .filter(Boolean)
        .join(' ');

    const close = useCallback(() => {
        onOpenChange?.(false);
    }, [onOpenChange]);

    usePopoverDismiss({
        open,
        onClose: close,
        refs: dismissRefs,
    });

    const focusOption = useCallback(
        (index: number) => {
            const optionCount = options.length;
            if (optionCount === 0) {
                return;
            }

            const nextIndex = ((index % optionCount) + optionCount) % optionCount;
            optionRefs.current[nextIndex]?.focus();
        },
        [options.length],
    );

    useEffect(() => {
        if (!open || pendingFocusIndexRef.current === null) {
            return;
        }

        const nextIndex = pendingFocusIndexRef.current;
        pendingFocusIndexRef.current = null;
        focusOption(nextIndex);
    }, [focusOption, open]);

    const openAndFocus = (index: number) => {
        pendingFocusIndexRef.current = index;
        onOpenChange?.(true);
    };

    const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
            return;
        }

        event.preventDefault();
        if (open) {
            focusOption(event.key === 'ArrowDown' ? activeIndex : options.length - 1);
            return;
        }

        openAndFocus(event.key === 'ArrowDown' ? activeIndex : options.length - 1);
    };

    const onOptionKeyDown = (
        index: number,
        option: BubbleMenuSelectOption,
        event: KeyboardEvent<HTMLButtonElement>,
    ) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusOption(index + 1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusOption(index - 1);
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            focusOption(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            focusOption(options.length - 1);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            triggerRef.current?.focus();
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            option.onSelect();
            close();
            triggerRef.current?.focus();
        }
    };

    return (
        <span
            className={hostClassName}
            data-popover-open={open ? 'true' : undefined}
            data-nameless-editor-tooltip={tooltip}
            {...{ [EDITOR_TOOLTIP_SCOPE_ATTRIBUTE]: tooltipScopeId ?? undefined }}
        >
            <MenuButton
                ref={triggerRef}
                active={open}
                withText
                className="nlx-editor-bubble-menu-select-trigger"
                aria-label={ariaLabel}
                aria-controls={open ? popoverId : undefined}
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => onOpenChange?.(!open)}
                onKeyDown={onTriggerKeyDown}
                {...toDataAttributes(triggerDataAttribute)}
            >
                <span className="nlx-editor-bubble-menu-select-trigger-content">{children}</span>
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
                    role="listbox"
                    aria-label={ariaLabel}
                    className="nlx-editor-popover nlx-editor-bubble-menu-select-popover"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    {options.map((option, index) => (
                        <MenuButton
                            key={option.key}
                            ref={(node) => {
                                optionRefs.current[index] = node;
                            }}
                            role="option"
                            tabIndex={option.active || (activeIndex === 0 && index === 0) ? 0 : -1}
                            active={option.active}
                            withText
                            className="nlx-editor-bubble-menu-select-option"
                            aria-label={option.label}
                            aria-selected={Boolean(option.active)}
                            onClick={() => {
                                option.onSelect();
                                close();
                            }}
                            onKeyDown={(event) => onOptionKeyDown(index, option, event)}
                            {...toDataAttributes(option.dataAttribute)}
                        >
                            {option.icon ? (
                                <span className="nlx-editor-bubble-menu-select-option-icon">
                                    {option.icon}
                                </span>
                            ) : null}
                            <span>{option.label}</span>
                        </MenuButton>
                    ))}
                </span>
            ) : null}
        </span>
    );
}
