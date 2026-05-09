import { flattenExtensions, type Extensions } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import type { HtmlIframePolicy, UrlPolicy } from '../security/types';
import { sanitizeUrl } from '../security/urlPolicy';

const EMPTY_DOCUMENT: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
};

const ALLOWED_NODES = new Set([
    'doc',
    'paragraph',
    'text',
    'heading',
    'blockquote',
    'bulletList',
    'orderedList',
    'listItem',
    'taskList',
    'taskItem',
    'codeBlock',
    'hardBreak',
    'horizontalRule',
    'table',
    'tableRow',
    'tableHeader',
    'tableCell',
    'image',
]);

const ALLOWED_MARKS = new Set([
    'bold',
    'italic',
    'strike',
    'underline',
    'code',
    'link',
    'highlight',
    'textStyle',
]);

const BLOCKED_ATTRIBUTE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const GENERIC_URL_ATTRIBUTE_KEYS = new Set(['href', 'src', 'url', 'poster']);

const LINK_URL_POLICY: UrlPolicy = {
    allowedProtocols: ['http:', 'https:', 'mailto:'],
    allowRelativeUrls: true,
    allowProtocolRelativeUrls: false,
};

const MEDIA_URL_POLICY: UrlPolicy = {
    allowedProtocols: ['http:', 'https:'],
    allowRelativeUrls: true,
    allowProtocolRelativeUrls: false,
};

const IFRAME_URL_POLICY: UrlPolicy = {
    allowedProtocols: ['https:'],
    allowRelativeUrls: false,
    allowProtocolRelativeUrls: false,
};

export type NormalizeIframeOptions = HtmlIframePolicy;

export interface EditorAttributeSanitizerContext {
    kind: 'node' | 'mark';
    type: string;
    sanitizeUrl: typeof sanitizeUrl;
}

export type EditorAttributeSanitizerResult = Record<string, unknown> | null | undefined;

export type EditorAttributeSanitizer = (
    attrs: Record<string, unknown>,
    context: EditorAttributeSanitizerContext,
) => EditorAttributeSanitizerResult;

export interface EditorAttributeSanitizers {
    nodes?: Record<string, EditorAttributeSanitizer>;
    marks?: Record<string, EditorAttributeSanitizer>;
}

export interface NormalizeEditorJsonOptions {
    allowedNodeTypes?: Iterable<string>;
    allowedMarkTypes?: Iterable<string>;
    customNodeTypes?: Iterable<string>;
    customMarkTypes?: Iterable<string>;
    iframe?: NormalizeIframeOptions;
    attributeSanitizers?: EditorAttributeSanitizers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeUrlAttr(value: unknown, policy: UrlPolicy): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    const sanitized = sanitizeUrl(trimmed, policy);
    if (!sanitized) {
        return undefined;
    }

    if (
        /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('#')
    ) {
        return trimmed;
    }

    return sanitized;
}

function getGenericUrlAttrPolicy(key: string): UrlPolicy | undefined {
    const normalizedKey = key.toLowerCase();
    if (!GENERIC_URL_ATTRIBUTE_KEYS.has(normalizedKey)) {
        return undefined;
    }

    return normalizedKey === 'href' ? LINK_URL_POLICY : MEDIA_URL_POLICY;
}

function pickString(attrs: Record<string, unknown>, key: string): string | undefined {
    const value = attrs[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
}

function pickNumber(attrs: Record<string, unknown>, key: string): number | undefined {
    const value = attrs[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isAllowedCustomType(type: string, values?: Iterable<string>): boolean {
    if (!values) {
        return false;
    }

    for (const value of values) {
        if (value === type) {
            return true;
        }
    }

    return false;
}

function isAllowedType(
    type: string,
    configuredTypes: Iterable<string> | undefined,
    defaultTypes: Set<string>,
): boolean {
    if (configuredTypes) {
        return isAllowedCustomType(type, configuredTypes);
    }

    return defaultTypes.has(type);
}

function isAllowedIframeSrc(src: string, iframe?: NormalizeIframeOptions): boolean {
    if (!iframe?.enabled) {
        return false;
    }

    const safeUrl = sanitizeUrl(src, IFRAME_URL_POLICY);
    if (!safeUrl) {
        return false;
    }

    try {
        return (iframe.allowedHosts ?? []).includes(new URL(safeUrl).hostname);
    } catch {
        return false;
    }
}

export function createNormalizeOptions(
    extensions?: Extensions,
    options: Pick<NormalizeEditorJsonOptions, 'iframe' | 'attributeSanitizers'> & {
        strictExtensionSchema?: boolean;
    } = {},
): NormalizeEditorJsonOptions {
    const allowedNodeTypes = new Set<string>();
    const allowedMarkTypes = new Set<string>();
    const customNodeTypes = new Set<string>();
    const customMarkTypes = new Set<string>();

    if (extensions?.length) {
        flattenExtensions(extensions).forEach((extension) => {
            if (extension.type === 'node') {
                allowedNodeTypes.add(extension.name);
                if (!ALLOWED_NODES.has(extension.name) && extension.name !== 'iframe') {
                    customNodeTypes.add(extension.name);
                }
            }

            if (extension.type === 'mark') {
                allowedMarkTypes.add(extension.name);
                if (!ALLOWED_MARKS.has(extension.name)) {
                    customMarkTypes.add(extension.name);
                }
            }
        });
    }

    return {
        allowedNodeTypes:
            options.strictExtensionSchema && extensions?.length ? allowedNodeTypes : undefined,
        allowedMarkTypes:
            options.strictExtensionSchema && extensions?.length ? allowedMarkTypes : undefined,
        customNodeTypes,
        customMarkTypes,
        iframe: options.iframe,
        attributeSanitizers: options.attributeSanitizers,
    };
}

function sanitizeJsonValue(value: unknown, depth = 0): unknown {
    if (depth > 8) {
        return undefined;
    }

    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }

    if (Array.isArray(value)) {
        const sanitizedArray = value
            .map((item) => sanitizeJsonValue(item, depth + 1))
            .filter((item) => item !== undefined);

        return sanitizedArray;
    }

    if (!isRecord(value)) {
        return undefined;
    }

    const sanitizedRecord: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, item]) => {
        if (BLOCKED_ATTRIBUTE_KEYS.has(key)) {
            return;
        }

        const urlPolicy = getGenericUrlAttrPolicy(key);
        if (urlPolicy) {
            const sanitizedUrl = sanitizeUrlAttr(item, urlPolicy);
            if (sanitizedUrl !== undefined) {
                sanitizedRecord[key] = sanitizedUrl;
            }
            return;
        }

        const sanitizedValue = sanitizeJsonValue(item, depth + 1);
        if (sanitizedValue !== undefined) {
            sanitizedRecord[key] = sanitizedValue;
        }
    });

    return sanitizedRecord;
}

function sanitizeGenericAttrs(attrs: unknown): Record<string, unknown> | undefined {
    const sanitized = sanitizeJsonValue(attrs);
    if (!isRecord(sanitized) || Object.keys(sanitized).length === 0) {
        return undefined;
    }

    return sanitized;
}

function hasGenericUrlAttrs(attrs: unknown): boolean {
    if (!isRecord(attrs)) {
        return false;
    }

    return Object.keys(attrs).some((key) => GENERIC_URL_ATTRIBUTE_KEYS.has(key.toLowerCase()));
}

function hasSafeGenericUrlAttrs(attrs: Record<string, unknown> | undefined): boolean {
    if (!attrs) {
        return false;
    }

    return Object.keys(attrs).some((key) => GENERIC_URL_ATTRIBUTE_KEYS.has(key.toLowerCase()));
}

function sanitizeAttributesWithCustomPolicy(
    kind: 'node' | 'mark',
    type: string,
    attrs: unknown,
    options?: NormalizeEditorJsonOptions,
): EditorAttributeSanitizerResult {
    if (!isRecord(attrs)) {
        return undefined;
    }

    const sanitizer =
        kind === 'node'
            ? options?.attributeSanitizers?.nodes?.[type]
            : options?.attributeSanitizers?.marks?.[type];
    if (!sanitizer) {
        return undefined;
    }

    const sanitized = sanitizer(attrs, {
        kind,
        type,
        sanitizeUrl,
    });
    if (sanitized === null) {
        return null;
    }

    return sanitizeGenericAttrs(sanitized);
}

function sanitizeNodeAttrs(
    type: string,
    attrs: unknown,
    options?: NormalizeEditorJsonOptions,
): Record<string, unknown> | null | undefined {
    if (!isRecord(attrs)) {
        return undefined;
    }

    const safeAttrs: Record<string, unknown> = {};

    if (type === 'paragraph') {
        const textAlign = pickString(attrs, 'textAlign');
        if (textAlign && ['left', 'center', 'right', 'justify'].includes(textAlign)) {
            safeAttrs.textAlign = textAlign;
        }
    }

    if (type === 'heading') {
        const level = pickNumber(attrs, 'level');
        if (level && Number.isInteger(level) && level >= 1 && level <= 6) {
            safeAttrs.level = level;
        }

        const textAlign = pickString(attrs, 'textAlign');
        if (textAlign && ['left', 'center', 'right', 'justify'].includes(textAlign)) {
            safeAttrs.textAlign = textAlign;
        }
    }

    if (type === 'codeBlock') {
        const language = pickString(attrs, 'language') ?? pickString(attrs, 'defaultLanguage');
        if (language) {
            safeAttrs.language = language;
        }
    }

    if (type === 'image') {
        const src = sanitizeUrlAttr(attrs.src, MEDIA_URL_POLICY);
        if (src) {
            safeAttrs.src = src;
        }

        const alt = pickString(attrs, 'alt');
        const title = pickString(attrs, 'title');
        const width = pickNumber(attrs, 'width');
        const height = pickNumber(attrs, 'height');

        if (alt) safeAttrs.alt = alt;
        if (title) safeAttrs.title = title;
        if (width) safeAttrs.width = width;
        if (height) safeAttrs.height = height;
    }

    if (type === 'iframe') {
        const src =
            typeof attrs.src === 'string' && isAllowedIframeSrc(attrs.src, options?.iframe)
                ? sanitizeUrl(attrs.src, IFRAME_URL_POLICY)
                : undefined;
        if (src) {
            safeAttrs.src = src;
        }

        const title = pickString(attrs, 'title');
        const allow = pickString(attrs, 'allow');
        const loading = pickString(attrs, 'loading');

        if (title) safeAttrs.title = title;
        if (allow) safeAttrs.allow = allow;
        if (loading && ['lazy', 'eager'].includes(loading)) safeAttrs.loading = loading;
        if (typeof attrs.allowfullscreen === 'boolean') {
            safeAttrs.allowfullscreen = attrs.allowfullscreen;
        }
    }

    if (type === 'taskItem' && typeof attrs.checked === 'boolean') {
        safeAttrs.checked = attrs.checked;
    }

    return Object.keys(safeAttrs).length > 0 ? safeAttrs : undefined;
}

type EditorJsonMark = NonNullable<JSONContent['marks']>[number];
type EditorJsonContent = NonNullable<JSONContent['content']>;

function sanitizeMark(mark: unknown, options?: NormalizeEditorJsonOptions): EditorJsonMark | null {
    if (!isRecord(mark) || typeof mark.type !== 'string') {
        return null;
    }

    const isCustomMark = isAllowedCustomType(mark.type, options?.customMarkTypes);
    const isConfiguredMark = isAllowedType(mark.type, options?.allowedMarkTypes, ALLOWED_MARKS);
    if (!isConfiguredMark && !isCustomMark) {
        return null;
    }

    const safeMark: EditorJsonMark = { type: mark.type };

    if (isCustomMark) {
        const customAttrs = sanitizeAttributesWithCustomPolicy(
            'mark',
            mark.type,
            mark.attrs,
            options,
        );
        if (customAttrs === null) {
            return null;
        }

        const attrs = customAttrs ?? sanitizeGenericAttrs(mark.attrs);
        if (attrs) {
            safeMark.attrs = attrs;
        }

        return safeMark;
    }

    if (mark.type === 'link') {
        const attrs = isRecord(mark.attrs) ? mark.attrs : {};
        const href = sanitizeUrlAttr(attrs.href, LINK_URL_POLICY);
        if (!href) {
            return null;
        }

        safeMark.attrs = {
            href,
        };

        const title = pickString(attrs, 'title');
        const target = pickString(attrs, 'target');
        const rel = pickString(attrs, 'rel');

        if (title) safeMark.attrs.title = title;
        if (target && ['_blank', '_self', '_parent', '_top'].includes(target)) {
            safeMark.attrs.target = target;
        }
        if (rel) safeMark.attrs.rel = rel;
    }

    if (mark.type === 'highlight') {
        const attrs = isRecord(mark.attrs) ? mark.attrs : {};
        const color = pickString(attrs, 'color');
        if (color) {
            safeMark.attrs = { color };
        }
    }

    if (mark.type === 'textStyle') {
        const attrs = isRecord(mark.attrs) ? mark.attrs : {};
        const color = pickString(attrs, 'color');
        if (color) {
            safeMark.attrs = { color };
        }
    }

    return safeMark;
}

function sanitizeMarks(
    marks: unknown,
    options?: NormalizeEditorJsonOptions,
): EditorJsonMark[] | undefined {
    if (!Array.isArray(marks)) {
        return undefined;
    }

    const safeMarks = marks
        .map((mark) => sanitizeMark(mark, options))
        .filter((mark): mark is EditorJsonMark => mark !== null);

    return safeMarks.length > 0 ? safeMarks : undefined;
}

function normalizeNode(
    value: unknown,
    options?: NormalizeEditorJsonOptions,
): EditorJsonContent[number] | null {
    if (!isRecord(value) || typeof value.type !== 'string') {
        return null;
    }

    const isCustomNode = isAllowedCustomType(value.type, options?.customNodeTypes);
    const isIframeNode = value.type === 'iframe' && options?.iframe?.enabled;
    const isConfiguredNode = isAllowedType(value.type, options?.allowedNodeTypes, ALLOWED_NODES);
    if (!isConfiguredNode && !isCustomNode && !isIframeNode) {
        return null;
    }

    if (value.type === 'iframe' && !isIframeNode && !isCustomNode) {
        return null;
    }

    if (value.type === 'text') {
        if (typeof value.text !== 'string') {
            return null;
        }

        const textNode: EditorJsonContent[number] = {
            type: 'text',
            text: value.text,
        };
        const marks = sanitizeMarks(value.marks, options);
        if (marks) {
            textNode.marks = marks;
        }

        return textNode;
    }

    const node: EditorJsonContent[number] = { type: value.type };

    const customAttrs = isCustomNode
        ? sanitizeAttributesWithCustomPolicy('node', value.type, value.attrs, options)
        : undefined;
    if (customAttrs === null) {
        return null;
    }

    const attrs = isCustomNode
        ? (customAttrs ?? sanitizeGenericAttrs(value.attrs))
        : sanitizeNodeAttrs(value.type, value.attrs, options);
    if (attrs === null) {
        return null;
    }
    if (isCustomNode && hasGenericUrlAttrs(value.attrs) && !hasSafeGenericUrlAttrs(attrs)) {
        return null;
    }
    if (value.type === 'image' && !attrs?.src) {
        return null;
    }

    if (value.type === 'iframe' && !attrs?.src && !isCustomNode) {
        return null;
    }
    if (attrs) {
        node.attrs = attrs;
    }

    if (Array.isArray(value.content)) {
        const content = value.content
            .map((child) => normalizeNode(child, options))
            .filter((child): child is JSONContent => child !== null);

        if (content.length > 0) {
            node.content = content;
        }
    }

    return node;
}

export function createEmptyDocument(): JSONContent {
    return structuredClone(EMPTY_DOCUMENT);
}

export function isEditorJson(value: unknown): value is JSONContent {
    if (!isRecord(value) || value.type !== 'doc') {
        return false;
    }

    return value.content === undefined || Array.isArray(value.content);
}

export function normalizeEditorJson(
    value: unknown,
    options?: NormalizeEditorJsonOptions,
): JSONContent {
    if (!isEditorJson(value)) {
        return createEmptyDocument();
    }

    const normalized = normalizeNode(value, options);
    if (!normalized || normalized.type !== 'doc' || !normalized.content?.length) {
        return createEmptyDocument();
    }

    return normalized;
}
