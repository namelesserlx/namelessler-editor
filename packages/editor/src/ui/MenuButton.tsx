import React from 'react';

export interface MenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    withText?: boolean;
}

export interface TooltipMenuButtonProps extends MenuButtonProps {
    label?: string;
    tooltip?: string;
}

export const MenuButton = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
    ({ active = false, withText = false, className, onMouseDown, children, ...rest }, ref) => {
        const classes = [
            'nlx-editor-button',
            active ? 'nlx-editor-button-active' : '',
            withText ? 'nlx-editor-button-with-text' : '',
            className ?? '',
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                ref={ref}
                type="button"
                className={classes}
                onMouseDown={(e) => {
                    e.preventDefault();
                    onMouseDown?.(e);
                }}
                {...rest}
            >
                {children}
            </button>
        );
    },
);

MenuButton.displayName = 'MenuButton';

export function TooltipMenuButton({
    label,
    tooltip,
    title,
    children,
    ...buttonProps
}: TooltipMenuButtonProps) {
    const ariaLabel = buttonProps['aria-label'];
    const resolvedLabel =
        label ?? (typeof ariaLabel === 'string' ? ariaLabel : undefined) ?? title?.toString();
    const resolvedTooltip = tooltip ?? resolvedLabel;

    return (
        <span className="nlx-editor-tooltip-host" data-tooltip={resolvedTooltip}>
            <MenuButton aria-label={resolvedLabel} {...buttonProps}>
                {children}
            </MenuButton>
        </span>
    );
}
