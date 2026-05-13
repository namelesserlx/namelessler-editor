import type { JSONContent } from '@tiptap/core';
import type { FormatSchemaSupport } from './schema';
import type { FormatWarning, UnsupportedContentStrategy } from './types';

export interface UnsupportedContentResult {
    value: JSONContent;
    warnings: FormatWarning[];
    failed: boolean;
}

type JsonPath = Array<string | number>;

function createUnsupportedNodeWarning(type: string, target: string, path: JsonPath): FormatWarning {
    return {
        code: 'UNSUPPORTED_NODE',
        message: `Node "${type}" cannot be exported to ${target}.`,
        path,
    };
}

function createUnsupportedMarkWarning(type: string, target: string, path: JsonPath): FormatWarning {
    return {
        code: 'UNSUPPORTED_MARK',
        message: `Mark "${type}" cannot be exported to ${target}.`,
        path,
    };
}

function createPlaceholderNode(type: string): JSONContent {
    return {
        type: 'paragraph',
        content: [{ type: 'text', text: `[Unsupported node: ${type}]` }],
    };
}

function transformMarks(
    marks: JSONContent['marks'],
    support: FormatSchemaSupport,
    target: string,
    strategy: UnsupportedContentStrategy,
    path: JsonPath,
    warnings: FormatWarning[],
): { marks: JSONContent['marks']; failed: boolean } {
    if (!Array.isArray(marks)) {
        return { marks: undefined, failed: false };
    }

    let failed = false;
    const nextMarks = marks.filter((mark, index) => {
        if (support.marks.has(mark.type)) {
            return true;
        }

        warnings.push(createUnsupportedMarkWarning(mark.type, target, [...path, 'marks', index]));
        failed = strategy === 'fail' || failed;
        return false;
    });

    return {
        marks: nextMarks.length > 0 ? nextMarks : undefined,
        failed,
    };
}

function transformNode(
    node: JSONContent,
    support: FormatSchemaSupport,
    target: string,
    strategy: UnsupportedContentStrategy,
    path: JsonPath,
    warnings: FormatWarning[],
): { node: JSONContent | null; failed: boolean } {
    if (!node.type) {
        return { node: null, failed: false };
    }

    if (!support.nodes.has(node.type)) {
        warnings.push(createUnsupportedNodeWarning(node.type, target, path));

        return {
            node: strategy === 'placeholder' ? createPlaceholderNode(node.type) : null,
            failed: strategy === 'fail',
        };
    }

    const nextNode: JSONContent = { ...node };
    let failed = false;

    const marks = transformMarks(node.marks, support, target, strategy, path, warnings);
    failed = failed || marks.failed;
    if (marks.marks) {
        nextNode.marks = marks.marks;
    } else {
        delete nextNode.marks;
    }

    if (Array.isArray(node.content)) {
        const nextContent: JSONContent[] = [];
        node.content.forEach((child, index) => {
            const transformed = transformNode(
                child,
                support,
                target,
                strategy,
                [...path, 'content', index],
                warnings,
            );

            failed = failed || transformed.failed;
            if (transformed.node) {
                nextContent.push(transformed.node);
            }
        });

        if (nextContent.length > 0) {
            nextNode.content = nextContent;
        } else {
            delete nextNode.content;
        }
    }

    return { node: nextNode, failed };
}

export function applyUnsupportedContentStrategy(
    doc: JSONContent,
    support: FormatSchemaSupport,
    target: string,
    strategy: UnsupportedContentStrategy,
): UnsupportedContentResult {
    const warnings: FormatWarning[] = [];
    const transformed = transformNode(doc, support, target, strategy, [], warnings);

    return {
        value: transformed.node ?? { type: 'doc', content: [{ type: 'paragraph' }] },
        warnings,
        failed: transformed.failed,
    };
}
