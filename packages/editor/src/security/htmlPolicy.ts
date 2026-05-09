import DOMPurify from 'dompurify';
import type { HtmlPolicy } from './types';
import { sanitizeUrl } from './urlPolicy';

type DomPurifySanitize = (input: string, config?: Record<string, unknown>) => string;

function normalizePolicy(policy?: HtmlPolicy): Required<HtmlPolicy> {
    return {
        iframe: {
            enabled: policy?.iframe?.enabled ?? false,
            allowedHosts: policy?.iframe?.allowedHosts ?? [],
        },
    };
}

function isAllowedIframeSrc(src: string, allowedHosts: string[]): boolean {
    const safeUrl = sanitizeUrl(src, {
        allowedProtocols: ['https:'],
        allowRelativeUrls: false,
        allowProtocolRelativeUrls: false,
    });
    if (!safeUrl) {
        return false;
    }

    try {
        return allowedHosts.includes(new URL(safeUrl).hostname);
    } catch {
        return false;
    }
}

const SAFE_HEX_COLOR_PATTERN = /^#[0-9a-f]{3,8}$/i;
const SAFE_RGB_COLOR_PATTERN =
    /^rgba?\(\s*(?:\d{1,3}%?\s*,\s*){2}\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+|100%|\d{1,2}%))?\s*\)$/i;
const SAFE_HSL_COLOR_PATTERN =
    /^hsla?\(\s*\d{1,3}(?:deg|rad|turn)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+|100%|\d{1,2}%))?\s*\)$/i;
const SAFE_NAMED_COLORS = new Set(['black', 'white', 'transparent', 'currentcolor']);
const SAFE_TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify']);

function isSafeCssColor(value: string): boolean {
    const normalized = value.trim().toLowerCase();

    return (
        SAFE_HEX_COLOR_PATTERN.test(normalized) ||
        SAFE_RGB_COLOR_PATTERN.test(normalized) ||
        SAFE_HSL_COLOR_PATTERN.test(normalized) ||
        SAFE_NAMED_COLORS.has(normalized)
    );
}

function sanitizeStyleAttribute(style: string): string | null {
    const safeDeclarations: string[] = [];

    style.split(';').forEach((declaration) => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex < 0) {
            return;
        }

        const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
        const value = declaration.slice(separatorIndex + 1).trim();
        const normalizedValue = value.toLowerCase();

        if ((property === 'color' || property === 'background-color') && isSafeCssColor(value)) {
            safeDeclarations.push(`${property}: ${value}`);
        }

        if (property === 'text-align' && SAFE_TEXT_ALIGN_VALUES.has(normalizedValue)) {
            safeDeclarations.push(`${property}: ${normalizedValue}`);
        }
    });

    return safeDeclarations.length > 0 ? safeDeclarations.join('; ') : null;
}

function hasBrowserDocument(): boolean {
    return typeof document !== 'undefined' && document.nodeType === 9;
}

function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function removeUnsafeTagsWithoutDom(html: string): string {
    return html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<script\b[^>]*\/?>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
        .replace(/<style\b[^>]*\/?>/gi, '');
}

function removeEventHandlersWithoutDom(html: string): string {
    return html.replace(/\s+on[a-z0-9:-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi, '');
}

function sanitizeUrlAttributesWithoutDom(html: string): string {
    return html.replace(
        /\s+(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
        (_attribute, name: string, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
            const value = doubleQuoted ?? singleQuoted ?? bare ?? '';
            const policy =
                name.toLowerCase() === 'href'
                    ? {
                          allowedProtocols: ['http:', 'https:', 'mailto:'],
                          allowRelativeUrls: true,
                          allowProtocolRelativeUrls: false,
                      }
                    : {
                          allowedProtocols: ['http:', 'https:'],
                          allowRelativeUrls: true,
                          allowProtocolRelativeUrls: false,
                      };
            const safeUrl = sanitizeUrl(value, policy);

            return safeUrl ? ` ${name.toLowerCase()}="${escapeAttribute(safeUrl)}"` : '';
        },
    );
}

function sanitizeStyleAttributesWithoutDom(html: string): string {
    return html.replace(
        /\s+style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
        (_attribute, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
            const value = doubleQuoted ?? singleQuoted ?? bare ?? '';
            const safeStyle = sanitizeStyleAttribute(value);

            return safeStyle ? ` style="${escapeAttribute(safeStyle)}"` : '';
        },
    );
}

function enforceIframePolicyWithoutDom(html: string, policy: Required<HtmlPolicy>): string {
    if (!policy.iframe.enabled) {
        return html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '');
    }

    return html.replace(/<iframe\b([^>]*)>[\s\S]*?<\/iframe\s*>/gi, (_iframe, attrs: string) => {
        const srcMatch = attrs.match(/\s+src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
        const src = srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3];
        if (!src || !isAllowedIframeSrc(src, policy.iframe.allowedHosts ?? [])) {
            return '';
        }

        const safeSrc = sanitizeUrl(src, { allowedProtocols: ['https:'] });
        if (!safeSrc) {
            return '';
        }

        const allowFullscreen = /\s+allowfullscreen(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/i.test(
            attrs,
        );
        const titleMatch = attrs.match(/\s+title\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
        const title = titleMatch?.[1] ?? titleMatch?.[2] ?? titleMatch?.[3];

        return `<iframe src="${escapeAttribute(safeSrc)}"${
            title ? ` title="${escapeAttribute(title)}"` : ''
        }${allowFullscreen ? ' allowfullscreen=""' : ''}></iframe>`;
    });
}

function sanitizeWithoutDom(input: string, policy: Required<HtmlPolicy>): string {
    return enforceIframePolicyWithoutDom(
        sanitizeStyleAttributesWithoutDom(
            sanitizeUrlAttributesWithoutDom(
                removeEventHandlersWithoutDom(removeUnsafeTagsWithoutDom(input)),
            ),
        ),
        policy,
    );
}

function enforceStylePolicy(html: string): string {
    if (!hasBrowserDocument()) {
        return sanitizeStyleAttributesWithoutDom(html);
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
        const safeStyle = sanitizeStyleAttribute(element.getAttribute('style') ?? '');

        if (safeStyle) {
            element.setAttribute('style', safeStyle);
        } else {
            element.removeAttribute('style');
        }
    });

    return template.innerHTML;
}

function enforceIframePolicy(html: string, policy: Required<HtmlPolicy>): string {
    if (!hasBrowserDocument()) {
        return enforceIframePolicyWithoutDom(html, policy);
    }

    if (!policy.iframe.enabled) {
        return html;
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('iframe').forEach((iframe) => {
        const src = iframe.getAttribute('src');
        if (!src || !isAllowedIframeSrc(src, policy.iframe.allowedHosts ?? [])) {
            iframe.remove();
            return;
        }

        iframe.setAttribute('src', sanitizeUrl(src, { allowedProtocols: ['https:'] }) ?? '');

        Array.from(iframe.attributes).forEach((attribute) => {
            if (!['src', 'title', 'allow', 'allowfullscreen', 'loading'].includes(attribute.name)) {
                iframe.removeAttribute(attribute.name);
            }
        });
    });

    return template.innerHTML;
}

export function sanitizeHtml(input: string, policy?: HtmlPolicy): string {
    const resolvedPolicy = normalizePolicy(policy);
    const sanitize = (DOMPurify as unknown as { sanitize?: DomPurifySanitize }).sanitize;

    const sanitized =
        typeof sanitize === 'function'
            ? sanitize.call(DOMPurify, input, {
                  ADD_TAGS: resolvedPolicy.iframe.enabled ? ['iframe'] : [],
                  ADD_ATTR: resolvedPolicy.iframe.enabled
                      ? ['allow', 'allowfullscreen', 'loading', 'style', 'target', 'title']
                      : ['style', 'target'],
              })
            : sanitizeWithoutDom(input, resolvedPolicy);

    return enforceIframePolicy(enforceStylePolicy(sanitized), resolvedPolicy);
}
