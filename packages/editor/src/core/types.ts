import type { JSONContent } from '@tiptap/core';

export type EditorFormat = 'json' | 'html' | 'markdown';

export type EditorValue<Format extends EditorFormat = EditorFormat> = Format extends 'json'
    ? JSONContent
    : string;
