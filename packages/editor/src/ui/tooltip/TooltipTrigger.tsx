import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react';

export const EDITOR_TOOLTIP_ATTRIBUTE = 'data-nameless-editor-tooltip';
export const EDITOR_TOOLTIP_SCOPE_ATTRIBUTE = 'data-nameless-editor-tooltip-scope';
export const EDITOR_TOOLTIP_SELECTOR = `[${EDITOR_TOOLTIP_ATTRIBUTE}]`;
export const EDITOR_TOOLTIP_SCOPE_SELECTOR = `[${EDITOR_TOOLTIP_SCOPE_ATTRIBUTE}]`;

const EditorTooltipScopeContext = createContext<string | null>(null);

export interface EditorTooltipScopeProps {
    children: ReactNode;
    scopeId: string;
}

export function EditorTooltipScope({ children, scopeId }: EditorTooltipScopeProps) {
    return (
        <EditorTooltipScopeContext.Provider value={scopeId}>
            {children}
        </EditorTooltipScopeContext.Provider>
    );
}

export function useEditorTooltipScopeId() {
    return useContext(EditorTooltipScopeContext);
}

export interface TooltipTriggerProps extends HTMLAttributes<HTMLSpanElement> {
    label?: string;
    children: ReactNode;
}

export function TooltipTrigger({ label, className, children, ...props }: TooltipTriggerProps) {
    const classes = ['nlx-editor-tooltip-host', className ?? ''].filter(Boolean).join(' ');
    const scopeId = useEditorTooltipScopeId();

    return (
        <span
            className={classes}
            {...props}
            {...{ [EDITOR_TOOLTIP_ATTRIBUTE]: label || undefined }}
            {...{ [EDITOR_TOOLTIP_SCOPE_ATTRIBUTE]: scopeId ?? undefined }}
        >
            {children}
        </span>
    );
}
