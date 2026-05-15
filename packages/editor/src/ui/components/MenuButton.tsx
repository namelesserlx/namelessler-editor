import React from 'react';
import { TooltipTrigger } from '../tooltip/TooltipTrigger';

export interface MenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    withText?: boolean;
}

export interface TooltipMenuButtonProps extends MenuButtonProps {
    label?: string;
    tooltip?: string;
}

export const MenuButton = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
    (
        { active = false, withText = false, className, onClick, onMouseDown, children, ...rest },
        ref,
    ) => {
        const suppressClickRef = React.useRef(false);
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
                    if (e.button !== 0 || rest.disabled) {
                        return;
                    }

                    // Trigger editor commands on mouse down so the browser doesn't get a chance
                    // to drift the current text selection before the command runs.
                    suppressClickRef.current = true;
                    onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
                }}
                onClick={(e) => {
                    if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                    }

                    onClick?.(e);
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
        <TooltipTrigger label={resolvedTooltip}>
            <MenuButton aria-label={resolvedLabel} {...buttonProps}>
                {children}
            </MenuButton>
        </TooltipTrigger>
    );
}
