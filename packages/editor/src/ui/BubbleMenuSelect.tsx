import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { MenuButton } from './MenuButton';

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
    const hostClassName = ['nlx-editor-popover-host', tooltip ? 'nlx-editor-tooltip-host' : '']
        .filter(Boolean)
        .join(' ');

    return (
        <span
            className={hostClassName}
            data-popover-open={open ? 'true' : undefined}
            data-tooltip={tooltip}
        >
            <MenuButton
                active={open}
                withText
                className="nlx-editor-bubble-menu-select-trigger"
                aria-label={ariaLabel}
                onClick={() => onOpenChange?.(!open)}
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
                    className="nlx-editor-popover nlx-editor-bubble-menu-select-popover"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    {options.map((option) => (
                        <MenuButton
                            key={option.key}
                            active={option.active}
                            withText
                            className="nlx-editor-bubble-menu-select-option"
                            aria-label={option.label}
                            onClick={() => {
                                option.onSelect();
                                onOpenChange?.(false);
                            }}
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
