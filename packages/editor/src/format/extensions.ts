import type { Extensions } from '@tiptap/core';
import { createEditorExtensions } from '../core/createEditorExtensions';
import type { FormatConversionOptions } from './types';

export function createFormatExtensions(options?: FormatConversionOptions): Extensions {
    const extensions = options?.extensions ?? [];
    const editorOptions = options?.editorOptions;
    const iframe = editorOptions?.iframe ?? options?.iframe;
    const shouldEnableIframe = editorOptions?.features?.iframe ?? Boolean(iframe);

    return createEditorExtensions({
        ...editorOptions,
        iframe,
        features: {
            ...editorOptions?.features,
            iframe: shouldEnableIframe,
        },
        extraExtensions: [...(editorOptions?.extraExtensions ?? []), ...extensions],
    });
}
