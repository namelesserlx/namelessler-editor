import { useEffect, useRef, type RefObject } from 'react';

interface UsePopoverDismissOptions {
    open: boolean;
    onClose: () => void;
    refs: Array<RefObject<HTMLElement | null>>;
}

export function usePopoverDismiss({ open, onClose, refs }: UsePopoverDismissOptions): void {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open || typeof document === 'undefined') {
            return undefined;
        }

        const containsTarget = (target: EventTarget | null) =>
            target instanceof Node && refs.some((ref) => ref.current?.contains(target));

        const onPointerDown = (event: PointerEvent) => {
            if (containsTarget(event.target)) {
                return;
            }

            onCloseRef.current();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            onCloseRef.current();
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, refs]);
}
