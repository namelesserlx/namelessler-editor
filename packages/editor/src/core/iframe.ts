import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { sanitizeUrl } from '../security/urlPolicy';

export interface IframeExtensionOptions {
    allowedHosts?: string[];
    HTMLAttributes?: Record<string, unknown>;
}

export interface SetIframeEmbedOptions {
    src: string;
    title?: string;
    allow?: string;
    allowfullscreen?: boolean;
    loading?: 'lazy' | 'eager';
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        iframe: {
            setIframe: (options: SetIframeEmbedOptions) => ReturnType;
        };
    }
}

function isAllowedIframeSrc(src: string, allowedHosts: string[] = []): string | null {
    const safeUrl = sanitizeUrl(src, {
        allowedProtocols: ['https:'],
        allowRelativeUrls: false,
        allowProtocolRelativeUrls: false,
    });

    if (!safeUrl) {
        return null;
    }

    try {
        return allowedHosts.includes(new URL(safeUrl).hostname) ? safeUrl : null;
    } catch {
        return null;
    }
}

function pickAttribute(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const IframeEmbed = Node.create<IframeExtensionOptions>({
    name: 'iframe',

    group: 'block',
    atom: true,
    draggable: true,

    addOptions() {
        return {
            allowedHosts: [],
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: (element) =>
                    isAllowedIframeSrc(
                        element.getAttribute('src') ?? '',
                        this.options.allowedHosts,
                    ),
                renderHTML: (attributes) => {
                    const src = isAllowedIframeSrc(
                        pickAttribute(attributes.src) ?? '',
                        this.options.allowedHosts,
                    );

                    return src ? { src } : {};
                },
            },
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute('title'),
                renderHTML: (attributes) => {
                    const title = pickAttribute(attributes.title);
                    return title ? { title } : {};
                },
            },
            allow: {
                default: null,
                parseHTML: (element) => element.getAttribute('allow'),
                renderHTML: (attributes) => {
                    const allow = pickAttribute(attributes.allow);
                    return allow ? { allow } : {};
                },
            },
            allowfullscreen: {
                default: false,
                parseHTML: (element) => element.hasAttribute('allowfullscreen'),
                renderHTML: (attributes) =>
                    attributes.allowfullscreen ? { allowfullscreen: '' } : {},
            },
            loading: {
                default: 'lazy',
                parseHTML: (element) => {
                    const loading = element.getAttribute('loading');
                    return loading === 'eager' ? 'eager' : 'lazy';
                },
                renderHTML: (attributes) =>
                    attributes.loading === 'eager' ? { loading: 'eager' } : { loading: 'lazy' },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'iframe[src]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        if (!HTMLAttributes.src) {
            return ['div', { 'data-invalid-iframe': '' }];
        }

        return [
            'iframe',
            mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
                loading: HTMLAttributes.loading ?? 'lazy',
            }),
        ];
    },

    addCommands() {
        return {
            setIframe:
                (options) =>
                ({ commands }: CommandProps) => {
                    const src = isAllowedIframeSrc(options.src, this.options.allowedHosts);
                    if (!src) {
                        return false;
                    }

                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            ...options,
                            src,
                            loading: options.loading ?? 'lazy',
                        },
                    });
                },
        };
    },
});
