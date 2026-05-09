import {
    flattenExtensions,
    getExtensionField,
    type AnyExtension,
    type Extensions,
} from '@tiptap/core';
import {
    createNormalizeOptions,
    type EditorAttributeSanitizers,
    type NormalizeEditorJsonOptions,
    type NormalizeIframeOptions,
} from '../core/documentModel';
import type { IframeExtensionOptions } from '../core/iframe';

import type { FormatConversionOptions } from './types';

export function getIframeOptions(options?: FormatConversionOptions) {
    return options?.editorOptions?.iframe ?? options?.iframe;
}

export interface MarkdownSchemaSupport {
    nodes: Set<string>;
    marks: Set<string>;
}

function eachFlattenedExtension(
    extensions: Extensions | undefined,
    callback: (extension: AnyExtension) => void,
): void {
    if (!extensions?.length) {
        return;
    }

    flattenExtensions(extensions).forEach(callback);
}

function normalizeIframeOptions(
    iframe?: NormalizeIframeOptions | IframeExtensionOptions,
): NormalizeIframeOptions | undefined {
    if (!iframe) {
        return undefined;
    }

    if ('enabled' in iframe) {
        return iframe;
    }

    return {
        enabled: true,
        allowedHosts: iframe.allowedHosts,
    };
}

export function getNormalizeOptions(
    extensions?: Extensions,
    options: {
        iframe?: NormalizeIframeOptions | IframeExtensionOptions;
        attributeSanitizers?: EditorAttributeSanitizers;
    } = {},
): NormalizeEditorJsonOptions {
    return createNormalizeOptions(extensions, {
        iframe: normalizeIframeOptions(options.iframe),
        attributeSanitizers: options.attributeSanitizers,
        strictExtensionSchema: true,
    });
}

export function getMarkdownSchemaSupport(
    baseNodes: Iterable<string>,
    baseMarks: Iterable<string>,
    extensions?: Extensions,
): MarkdownSchemaSupport {
    const nodes = new Set(baseNodes);
    const marks = new Set(baseMarks);

    eachFlattenedExtension(extensions, (extension) => {
        const renderMarkdown = getExtensionField(extension, 'renderMarkdown');
        if (!renderMarkdown) {
            return;
        }

        if (extension.type === 'node') {
            nodes.add(extension.name);
        }

        if (extension.type === 'mark') {
            marks.add(extension.name);
        }
    });

    return { nodes, marks };
}
