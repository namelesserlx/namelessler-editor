import type { Extensions } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { deepMerge } from './deepMerge';
import { createLowlightRegistry, type EditorHighlightLanguage } from './highlight';
import { IframeEmbed, type IframeExtensionOptions } from './iframe';

export interface EditorFeatureFlags {
    links?: boolean;
    codeBlock?: boolean;
    tables?: boolean;
    taskList?: boolean;
    iframe?: boolean;
    color?: boolean;
    highlight?: boolean;
    underline?: boolean;
    textAlign?: boolean;
}

type LinkOptions = NonNullable<Parameters<typeof Link.configure>[0]>;
type HighlightOptions = NonNullable<Parameters<typeof Highlight.configure>[0]>;
type TextAlignOptions = NonNullable<Parameters<typeof TextAlign.configure>[0]>;
type CodeBlockOptions = NonNullable<Parameters<typeof CodeBlockLowlight.configure>[0]>;
type TableKitOptions = NonNullable<Parameters<typeof TableKit.configure>[0]>;

export interface CreateEditorExtensionsOptions {
    features?: EditorFeatureFlags;
    highlightLanguages?: EditorHighlightLanguage[];
    link?: Partial<LinkOptions>;
    highlight?: Partial<HighlightOptions>;
    textAlign?: Partial<TextAlignOptions>;
    codeBlock?: Partial<CodeBlockOptions>;
    table?: Partial<TableKitOptions>;
    iframe?: IframeExtensionOptions;
    iframeExtensions?: Extensions;
    extraExtensions?: Extensions;
}

const DEFAULT_FEATURES: Required<EditorFeatureFlags> = {
    links: true,
    codeBlock: true,
    tables: true,
    taskList: true,
    iframe: false,
    color: true,
    highlight: true,
    underline: true,
    textAlign: true,
};

function isFeatureEnabled(
    features: EditorFeatureFlags | undefined,
    feature: keyof EditorFeatureFlags,
): boolean {
    return features?.[feature] ?? DEFAULT_FEATURES[feature];
}

export function createEditorExtensions(options: CreateEditorExtensionsOptions = {}): Extensions {
    const extensions: Extensions = [
        StarterKit.configure({
            codeBlock: false,
            link: false,
            underline: false,
            heading: {
                levels: [1, 2, 3, 4, 5, 6],
            },
        }),
    ];

    if (isFeatureEnabled(options.features, 'codeBlock')) {
        const highlightLanguages = options.highlightLanguages ?? [];
        extensions.push(
            CodeBlockLowlight.configure(
                deepMerge(
                    {
                        lowlight: createLowlightRegistry(highlightLanguages),
                        defaultLanguage: highlightLanguages[0]?.name ?? null,
                    },
                    options.codeBlock,
                ) as CodeBlockOptions,
            ),
        );
    }

    if (isFeatureEnabled(options.features, 'tables')) {
        extensions.push(
            TableKit.configure(
                deepMerge(
                    {
                        table: {
                            resizable: true,
                        },
                    },
                    options.table,
                ) as TableKitOptions,
            ),
        );
    }

    if (isFeatureEnabled(options.features, 'taskList')) {
        extensions.push(TaskList, TaskItem.configure({ nested: true }));
    }

    extensions.push(TextStyle);

    if (isFeatureEnabled(options.features, 'color')) {
        extensions.push(Color);
    }

    if (isFeatureEnabled(options.features, 'underline')) {
        extensions.push(Underline);
    }

    if (isFeatureEnabled(options.features, 'links')) {
        extensions.push(
            Link.configure(
                deepMerge(
                    {
                        openOnClick: false,
                        defaultProtocol: 'https',
                        HTMLAttributes: {
                            target: '_blank',
                            rel: 'noopener noreferrer nofollow',
                        },
                    },
                    options.link,
                ) as LinkOptions,
            ),
        );
    }

    if (isFeatureEnabled(options.features, 'highlight')) {
        extensions.push(
            Highlight.configure(
                deepMerge(
                    {
                        multicolor: true,
                    },
                    options.highlight,
                ) as HighlightOptions,
            ),
        );
    }

    if (isFeatureEnabled(options.features, 'textAlign')) {
        extensions.push(
            TextAlign.configure(
                deepMerge(
                    {
                        types: ['heading', 'paragraph'],
                    },
                    options.textAlign,
                ) as TextAlignOptions,
            ),
        );
    }

    if (isFeatureEnabled(options.features, 'iframe')) {
        if (options.iframeExtensions) {
            extensions.push(...options.iframeExtensions);
        } else {
            extensions.push(IframeEmbed.configure(options.iframe));
        }
    }

    return [...extensions, ...(options.extraExtensions ?? [])];
}
