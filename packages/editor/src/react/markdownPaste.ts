import { Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { importEditorContent } from '../core';
import type { FormatConversionOptions } from '../format/types';

const MARKDOWN_DETECTION_MAX_CHARS = 4096;
const MARKDOWN_DETECTION_MAX_LINES = 80;
const MARKDOWN_SCROLL_MAX_CHARS = 8000;
const MARKDOWN_SCROLL_MAX_LINES = 80;

const MARKDOWN_BLOCK_PATTERNS = [
    /^\s{0,3}#{1,6}\s+\S/m,
    /^\s{0,3}(?:[-+*]|\d+[.)])\s+\S/m,
    /^\s{0,3}>\s+\S/m,
    /^\s{0,3}(?:```|~~~)/m,
    /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/m,
    /^\s{0,3}\|?.+\|.+\n\s{0,3}\|?\s*:?-{3,}:?\s*\|/m,
];

const MARKDOWN_INLINE_PATTERNS = [
    /(?:\*\*|__)\S[\s\S]*?\S(?:\*\*|__)/,
    /`[^`\n]+`/,
    /~~[^~\n]+~~/,
    /!?\[[^\]\n]+\]\([^)]+\)/,
];

function takeLineLimitedSample(text: string, maxChars: number, maxLines: number): string {
    const charLimited = text.slice(0, maxChars);
    const lines = charLimited.split(/\r\n?|\n/, maxLines);

    return lines.join('\n').trim();
}

function hasMoreThanLines(text: string, maxLines: number): boolean {
    let lines = 1;

    for (let index = 0; index < text.length; index += 1) {
        const char = text.charCodeAt(index);

        if (char === 10) {
            lines += 1;
        } else if (char === 13) {
            lines += 1;
            if (text.charCodeAt(index + 1) === 10) {
                index += 1;
            }
        }

        if (lines > maxLines) {
            return true;
        }
    }

    return false;
}

export function shouldParseMarkdownClipboardText(text: string): boolean {
    const value = takeLineLimitedSample(
        text,
        MARKDOWN_DETECTION_MAX_CHARS,
        MARKDOWN_DETECTION_MAX_LINES,
    );

    if (!value) {
        return false;
    }

    return [...MARKDOWN_BLOCK_PATTERNS, ...MARKDOWN_INLINE_PATTERNS].some((pattern) =>
        pattern.test(value),
    );
}

export function shouldScrollAfterMarkdownPaste(markdown: string): boolean {
    return (
        markdown.length <= MARKDOWN_SCROLL_MAX_CHARS &&
        !hasMoreThanLines(markdown, MARKDOWN_SCROLL_MAX_LINES)
    );
}

export function getMarkdownClipboardText(event: ClipboardEvent): string | null {
    const clipboard = event.clipboardData;

    if (!clipboard) {
        return null;
    }

    const explicitMarkdown =
        clipboard.getData('text/markdown') || clipboard.getData('text/x-markdown');

    if (explicitMarkdown.trim()) {
        return explicitMarkdown;
    }

    if (clipboard.getData('text/html')) {
        return null;
    }

    const plainText = clipboard.getData('text/plain') || clipboard.getData('Text');

    return shouldParseMarkdownClipboardText(plainText) ? plainText : null;
}

export function parseMarkdownClipboardText(
    text: string,
    view: EditorView,
    options: FormatConversionOptions,
): Slice | null {
    const imported = importEditorContent(text, {
        ...options,
        from: 'markdown',
    });
    const doc = view.state.schema.nodeFromJSON(imported.value);

    if (doc.content.size === 0) {
        return null;
    }

    return Slice.maxOpen(doc.content);
}

function isClipboardPasteEvent(event: Event): event is ClipboardEvent {
    return event.type === 'paste' && 'clipboardData' in event;
}

export function createMarkdownPasteHandler(
    getOptions: () => FormatConversionOptions,
    isEnabled: () => boolean,
) {
    return (view: EditorView, event: Event): boolean => {
        if (
            !isClipboardPasteEvent(event) ||
            !isEnabled() ||
            view.state.selection.$from.parent.type.spec.code
        ) {
            return false;
        }

        const markdown = getMarkdownClipboardText(event);
        if (!markdown) {
            return false;
        }

        const slice = parseMarkdownClipboardText(markdown, view, getOptions());
        if (!slice) {
            return false;
        }

        event.preventDefault();
        const transaction = view.state.tr
            .replaceSelection(slice)
            .setMeta('paste', true)
            .setMeta('uiEvent', 'paste');

        if (shouldScrollAfterMarkdownPaste(markdown)) {
            transaction.scrollIntoView();
        }

        view.dispatch(transaction);

        return true;
    };
}
