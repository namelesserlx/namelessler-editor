import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
    DEFAULT_EDITOR_TOOLTIP,
    type EditorTooltipPlacement,
    type ResolvedEditorTooltipOptions,
} from '../types';
import {
    EDITOR_TOOLTIP_ATTRIBUTE,
    EDITOR_TOOLTIP_SCOPE_ATTRIBUTE,
    EDITOR_TOOLTIP_SCOPE_SELECTOR,
    EDITOR_TOOLTIP_SELECTOR,
    EditorTooltipScope,
} from './TooltipTrigger';

export interface EditorTooltipProviderProps extends Partial<
    Omit<ResolvedEditorTooltipOptions, 'enabled'>
> {
    children: ReactNode;
}

type TooltipInput = 'focus' | 'pointer';

interface ActiveTooltip {
    input: TooltipInput;
    label: string;
    trigger: HTMLElement;
}

interface TooltipPosition {
    arrowLeft: number;
    left: number;
    ready: boolean;
    side: EditorTooltipPlacement;
    top: number;
}

const INTERACTIVE_SELECTOR = 'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
const MIN_ARROW_OFFSET = 8;

const EMPTY_POSITION: TooltipPosition = {
    arrowLeft: 0,
    left: 0,
    ready: false,
    side: DEFAULT_EDITOR_TOOLTIP.placement,
    top: 0,
};

function clamp(value: number, min: number, max: number) {
    if (max < min) {
        return min;
    }

    return Math.min(Math.max(value, min), max);
}

function getViewportSize() {
    const width = window.innerWidth || document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;

    return { width, height };
}

function findTooltipTrigger(
    target: EventTarget | null,
    scope: HTMLElement | null,
    scopeId: string,
    includeOpenPopover = false,
): HTMLElement | null {
    if (!(target instanceof Element)) {
        return null;
    }

    const trigger = target.closest<HTMLElement>(EDITOR_TOOLTIP_SELECTOR);
    if (!trigger) {
        return null;
    }

    if (!includeOpenPopover && trigger.getAttribute('data-popover-open') === 'true') {
        return null;
    }

    const label = trigger.getAttribute(EDITOR_TOOLTIP_ATTRIBUTE)?.trim();
    if (!label) {
        return null;
    }

    const scopedElement = trigger.closest<HTMLElement>(EDITOR_TOOLTIP_SCOPE_SELECTOR);
    const triggerScopeId = scopedElement?.getAttribute(EDITOR_TOOLTIP_SCOPE_ATTRIBUTE);

    if (triggerScopeId) {
        return triggerScopeId === scopeId ? trigger : null;
    }

    return scope?.contains(trigger) ? trigger : null;
}

function getTooltipLabel(trigger: HTMLElement) {
    return trigger.getAttribute(EDITOR_TOOLTIP_ATTRIBUTE)?.trim() ?? '';
}

function getDescribedElement(trigger: HTMLElement) {
    if (trigger.matches(INTERACTIVE_SELECTOR)) {
        return trigger;
    }

    return trigger.querySelector<HTMLElement>(INTERACTIVE_SELECTOR) ?? trigger;
}

function appendIdToken(value: string | null, id: string) {
    const tokens = new Set((value ?? '').split(/\s+/).filter(Boolean));
    tokens.add(id);
    return Array.from(tokens).join(' ');
}

function removeIdToken(value: string | null, id: string) {
    const tokens = (value ?? '').split(/\s+/).filter((token) => token && token !== id);
    return tokens.join(' ');
}

function getNextSide(
    requestedSide: EditorTooltipPlacement,
    triggerRect: DOMRect,
    tooltipRect: DOMRect,
    offset: number,
    viewportPadding: number,
) {
    const { height } = getViewportSize();
    const requiredSpace = tooltipRect.height + offset + viewportPadding;
    const topSpace = triggerRect.top;
    const bottomSpace = height - triggerRect.bottom;

    if (requestedSide === 'top' && topSpace < requiredSpace && bottomSpace > topSpace) {
        return 'bottom';
    }

    if (requestedSide === 'bottom' && bottomSpace < requiredSpace && topSpace > bottomSpace) {
        return 'top';
    }

    return requestedSide;
}

function arePositionsEqual(a: TooltipPosition, b: TooltipPosition) {
    return (
        a.arrowLeft === b.arrowLeft &&
        a.left === b.left &&
        a.ready === b.ready &&
        a.side === b.side &&
        a.top === b.top
    );
}

export function EditorTooltipProvider({
    children,
    closeDelay = DEFAULT_EDITOR_TOOLTIP.closeDelay,
    delay = DEFAULT_EDITOR_TOOLTIP.delay,
    offset = DEFAULT_EDITOR_TOOLTIP.offset,
    placement = DEFAULT_EDITOR_TOOLTIP.placement,
    viewportPadding = DEFAULT_EDITOR_TOOLTIP.viewportPadding,
    zIndex = DEFAULT_EDITOR_TOOLTIP.zIndex,
}: EditorTooltipProviderProps) {
    const tooltipId = useId();
    const scopeId = useId();
    const scopeRef = useRef<HTMLDivElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const openTimerRef = useRef<number | null>(null);
    const closeTimerRef = useRef<number | null>(null);
    const frameRef = useRef<number | null>(null);
    const describedElementRef = useRef<HTMLElement | null>(null);
    const previousDescribedByRef = useRef<string | null>(null);
    const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
    const [position, setPosition] = useState<TooltipPosition>(EMPTY_POSITION);

    const clearOpenTimer = useCallback(() => {
        if (openTimerRef.current !== null) {
            window.clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        }
    }, []);

    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const closeTooltip = useCallback(() => {
        clearOpenTimer();
        clearCloseTimer();
        setActiveTooltip(null);
        setPosition(EMPTY_POSITION);
    }, [clearCloseTimer, clearOpenTimer]);

    const queueClose = useCallback(() => {
        clearOpenTimer();
        clearCloseTimer();

        if (closeDelay > 0) {
            closeTimerRef.current = window.setTimeout(closeTooltip, closeDelay);
            return;
        }

        closeTooltip();
    }, [clearCloseTimer, clearOpenTimer, closeDelay, closeTooltip]);

    const openTooltip = useCallback(
        (trigger: HTMLElement, input: TooltipInput) => {
            const label = getTooltipLabel(trigger);
            if (!label) {
                closeTooltip();
                return;
            }

            clearCloseTimer();
            setActiveTooltip((current) => {
                if (
                    current?.trigger === trigger &&
                    current.label === label &&
                    current.input === input
                ) {
                    return current;
                }

                return { input, label, trigger };
            });
        },
        [clearCloseTimer, closeTooltip],
    );

    const queueOpen = useCallback(
        (trigger: HTMLElement, input: TooltipInput, nextDelay: number) => {
            clearOpenTimer();
            clearCloseTimer();

            if (nextDelay <= 0) {
                openTooltip(trigger, input);
                return;
            }

            openTimerRef.current = window.setTimeout(() => {
                openTimerRef.current = null;
                openTooltip(trigger, input);
            }, nextDelay);
        },
        [clearCloseTimer, clearOpenTimer, openTooltip],
    );

    const updatePosition = useCallback(() => {
        if (!activeTooltip || !tooltipRef.current) {
            return;
        }

        if (!document.body.contains(activeTooltip.trigger)) {
            closeTooltip();
            return;
        }

        const triggerRect = activeTooltip.trigger.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const { width, height } = getViewportSize();
        const side = getNextSide(placement, triggerRect, tooltipRect, offset, viewportPadding);
        const triggerCenter = triggerRect.left + triggerRect.width / 2;
        const maxLeft = width - tooltipRect.width - viewportPadding;
        const left = clamp(triggerCenter - tooltipRect.width / 2, viewportPadding, maxLeft);
        const rawTop =
            side === 'top'
                ? triggerRect.top - tooltipRect.height - offset
                : triggerRect.bottom + offset;
        const maxTop = height - tooltipRect.height - viewportPadding;
        const top = clamp(rawTop, viewportPadding, maxTop);
        const arrowLeft = clamp(
            triggerCenter - left,
            MIN_ARROW_OFFSET,
            Math.max(MIN_ARROW_OFFSET, tooltipRect.width - MIN_ARROW_OFFSET),
        );
        const nextPosition: TooltipPosition = {
            arrowLeft: Math.round(arrowLeft),
            left: Math.round(left),
            ready: true,
            side,
            top: Math.round(top),
        };

        setPosition((current) =>
            arePositionsEqual(current, nextPosition) ? current : nextPosition,
        );
    }, [activeTooltip, closeTooltip, offset, placement, viewportPadding]);

    const requestPositionUpdate = useCallback(() => {
        if (frameRef.current !== null) {
            return;
        }

        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null;
            updatePosition();
        });
    }, [updatePosition]);

    useLayoutEffect(() => {
        updatePosition();
    }, [activeTooltip, updatePosition]);

    useEffect(() => {
        if (!activeTooltip) {
            return;
        }

        const describedElement = getDescribedElement(activeTooltip.trigger);
        const previousValue = describedElement.getAttribute('aria-describedby');
        describedElementRef.current = describedElement;
        previousDescribedByRef.current = previousValue;
        describedElement.setAttribute('aria-describedby', appendIdToken(previousValue, tooltipId));

        return () => {
            const currentElement = describedElementRef.current;
            if (!currentElement) {
                return;
            }

            const currentValue = currentElement.getAttribute('aria-describedby');
            const nextValue = removeIdToken(currentValue, tooltipId);

            if (nextValue) {
                currentElement.setAttribute('aria-describedby', nextValue);
            } else if (previousDescribedByRef.current) {
                currentElement.setAttribute('aria-describedby', previousDescribedByRef.current);
            } else {
                currentElement.removeAttribute('aria-describedby');
            }

            describedElementRef.current = null;
            previousDescribedByRef.current = null;
        };
    }, [activeTooltip, tooltipId]);

    useEffect(() => {
        if (!activeTooltip) {
            return;
        }

        const onScroll = () => requestPositionUpdate();
        const onResize = () => requestPositionUpdate();
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeTooltip();
            }
        };

        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('resize', onResize);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('scroll', onScroll, { capture: true });
            window.removeEventListener('resize', onResize);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [activeTooltip, closeTooltip, requestPositionUpdate]);

    useEffect(
        () => () => {
            clearOpenTimer();
            clearCloseTimer();
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
            }
        },
        [clearCloseTimer, clearOpenTimer],
    );

    useEffect(() => {
        const getRelatedTarget = (event: Event) =>
            'relatedTarget' in event ? (event.relatedTarget as EventTarget | null) : null;

        const onPointerOver = (event: Event) => {
            const trigger = findTooltipTrigger(event.target, scopeRef.current, scopeId);
            const relatedTarget = getRelatedTarget(event);
            if (!trigger || (relatedTarget instanceof Node && trigger.contains(relatedTarget))) {
                return;
            }

            queueOpen(trigger, 'pointer', delay);
        };

        const onPointerOut = (event: Event) => {
            const trigger = findTooltipTrigger(event.target, scopeRef.current, scopeId, true);
            const relatedTarget = getRelatedTarget(event);
            if (!trigger || (relatedTarget instanceof Node && trigger.contains(relatedTarget))) {
                return;
            }

            queueClose();
        };

        const onFocusIn = (event: Event) => {
            const trigger = findTooltipTrigger(event.target, scopeRef.current, scopeId);
            if (trigger) {
                queueOpen(trigger, 'focus', 0);
            }
        };

        const onFocusOut = (event: Event) => {
            const trigger = findTooltipTrigger(event.target, scopeRef.current, scopeId, true);
            const relatedTarget = getRelatedTarget(event);
            if (!trigger || (relatedTarget instanceof Node && trigger.contains(relatedTarget))) {
                return;
            }

            queueClose();
        };

        document.addEventListener('pointerover', onPointerOver, true);
        document.addEventListener('pointerout', onPointerOut, true);
        document.addEventListener('focusin', onFocusIn, true);
        document.addEventListener('focusout', onFocusOut, true);
        document.addEventListener('pointerdown', closeTooltip, true);

        return () => {
            document.removeEventListener('pointerover', onPointerOver, true);
            document.removeEventListener('pointerout', onPointerOut, true);
            document.removeEventListener('focusin', onFocusIn, true);
            document.removeEventListener('focusout', onFocusOut, true);
            document.removeEventListener('pointerdown', closeTooltip, true);
        };
    }, [closeTooltip, delay, queueClose, queueOpen, scopeId]);

    const tooltip =
        activeTooltip && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      id={tooltipId}
                      ref={tooltipRef}
                      role="tooltip"
                      className="nlx-editor-tooltip"
                      data-nameless-editor-tooltip-portal="true"
                      data-ready={position.ready ? 'true' : 'false'}
                      data-side={position.side}
                      style={{
                          left: position.left,
                          top: position.top,
                          zIndex,
                      }}
                  >
                      <span className="nlx-editor-tooltip-content">{activeTooltip.label}</span>
                      <span
                          className="nlx-editor-tooltip-arrow"
                          aria-hidden="true"
                          style={{ left: position.arrowLeft }}
                      />
                  </div>,
                  document.body,
              )
            : null;

    return (
        <EditorTooltipScope scopeId={scopeId}>
            <div
                ref={scopeRef}
                className="nlx-editor-tooltip-scope"
                {...{ [EDITOR_TOOLTIP_SCOPE_ATTRIBUTE]: scopeId }}
            >
                {children}
                {tooltip}
            </div>
        </EditorTooltipScope>
    );
}
