import { useEffect, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';

export interface UseEditorSnapshotOptions {
    selectionUpdate?: boolean;
    update?: boolean;
}

export function useEditorSnapshot(
    editor: TiptapEditor,
    options: UseEditorSnapshotOptions = {},
): number {
    const [version, setVersion] = useState(0);
    const frameRef = useRef<number | null>(null);
    const listenToSelectionUpdate = options.selectionUpdate ?? true;
    const listenToUpdate = options.update ?? true;

    useEffect(() => {
        const refresh = () => {
            if (frameRef.current !== null) {
                return;
            }

            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;
                setVersion((current) => current + 1);
            });
        };

        if (listenToSelectionUpdate) {
            editor.on('selectionUpdate', refresh);
        }

        if (listenToUpdate) {
            editor.on('update', refresh);
        }

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }

            if (listenToSelectionUpdate) {
                editor.off('selectionUpdate', refresh);
            }

            if (listenToUpdate) {
                editor.off('update', refresh);
            }
        };
    }, [editor, listenToSelectionUpdate, listenToUpdate]);

    return version;
}
