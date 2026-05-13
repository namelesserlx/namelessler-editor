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

export type EditorContentWarningCode =
    | 'INVALID_DOCUMENT'
    | 'UNSUPPORTED_NODE'
    | 'UNSUPPORTED_MARK'
    | 'DROPPED_ATTRIBUTE'
    | 'SANITIZED_ATTRIBUTE'
    | 'SANITIZED_HTML'
    | 'LOSSY_MARKDOWN_EXPORT';

export interface EditorContentWarning {
    code: EditorContentWarningCode;
    message: string;
    path?: Array<string | number>;
}

export interface NormalizeEditorJsonResult {
    value: JSONContent;
    warnings: EditorContentWarning[];
    lossy: boolean;
}

type JsonPath = Array<string | number>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(record, key);
}

function isJsonValueEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
        return true;
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
            return false;
        }

        return left.every((item, index) => isJsonValueEqual(item, right[index]));
    }

    if (isRecord(left) || isRecord(right)) {
        if (!isRecord(left) || !isRecord(right)) {
            return false;
        }

        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length) {
            return false;
        }

        return leftKeys.every(
            (key) => hasOwn(right, key) && isJsonValueEqual(left[key], right[key]),
        );
    }

    return false;
}

function pushWarning(warnings: EditorContentWarning[], warning: EditorContentWarning): void {
    warnings.push(warning);
}

function reportAttributeChanges(
    warnings: EditorContentWarning[],
    kind: 'node' | 'mark',
    type: string,
    originalAttrs: unknown,
    safeAttrs: Record<string, unknown> | undefined,
    path: JsonPath,
): void {
    if (!isRecord(originalAttrs)) {
        return;
    }

    const safe = safeAttrs ?? {};

    Object.entries(originalAttrs).forEach(([key, value]) => {
        const attributePath = [...path, 'attrs', key];
        if (!hasOwn(safe, key)) {
            if (value == null) {
                return;
            }

            pushWarning(warnings, {
                code: 'DROPPED_ATTRIBUTE',
                message: `${kind === 'node' ? 'Node' : 'Mark'} "${type}" attribute "${key}" was dropped during normalization.`,
                path: attributePath,
            });
            return;
        }

        if (!isJsonValueEqual(value, safe[key])) {
            pushWarning(warnings, {
                code: 'SANITIZED_ATTRIBUTE',
                message: `${kind === 'node' ? 'Node' : 'Mark'} "${type}" attribute "${key}" was sanitized during normalization.`,
                path: attributePath,
            });
        }
    });
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
): Record<string, unknown> | undefined {
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

function mergeAttrs(
    baseAttrs: Record<string, unknown> | undefined,
    customAttrs: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
    const merged = {
        ...(baseAttrs ?? {}),
        ...(customAttrs ?? {}),
    };

    return Object.keys(merged).length > 0 ? merged : undefined;
}

function sanitizeLinkAttrs(
    attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
    if (!attrs) {
        return null;
    }

    const href = sanitizeUrlAttr(attrs.href, LINK_URL_POLICY);
    if (!href) {
        return null;
    }

    const safeAttrs: Record<string, unknown> = {
        ...attrs,
        href,
    };

    const title = pickString(attrs, 'title');
    const target = pickString(attrs, 'target');
    const rel = pickString(attrs, 'rel');

    if (title) {
        safeAttrs.title = title;
    } else {
        delete safeAttrs.title;
    }

    if (target && ['_blank', '_self', '_parent', '_top'].includes(target)) {
        safeAttrs.target = target;
    } else {
        delete safeAttrs.target;
    }

    if (rel) {
        safeAttrs.rel = rel;
    } else {
        delete safeAttrs.rel;
    }

    return safeAttrs;
}

function sanitizeColorMarkAttrs(
    attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
    if (!attrs) {
        return undefined;
    }

    const safeAttrs = { ...attrs };
    if ('color' in safeAttrs && typeof safeAttrs.color !== 'string') {
        delete safeAttrs.color;
    }

    return Object.keys(safeAttrs).length > 0 ? safeAttrs : undefined;
}

function sanitizeMark(
    mark: unknown,
    options: NormalizeEditorJsonOptions | undefined,
    warnings: EditorContentWarning[],
    path: JsonPath,
): EditorJsonMark | null {
    if (!isRecord(mark) || typeof mark.type !== 'string') {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_MARK',
            message: 'A mark without a valid type was dropped during normalization.',
            path,
        });
        return null;
    }

    const isCustomMark = isAllowedCustomType(mark.type, options?.customMarkTypes);
    const isConfiguredMark = isAllowedType(mark.type, options?.allowedMarkTypes, ALLOWED_MARKS);
    if (!isConfiguredMark && !isCustomMark) {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_MARK',
            message: `Mark "${mark.type}" is not enabled in the current schema.`,
            path,
        });
        return null;
    }

    const safeMark: EditorJsonMark = { type: mark.type };
    let baseAttrs: Record<string, unknown> | undefined;

    if (mark.type === 'link') {
        const attrs = isRecord(mark.attrs) ? mark.attrs : {};
        const href = sanitizeUrlAttr(attrs.href, LINK_URL_POLICY);
        if (!href) {
            pushWarning(warnings, {
                code: 'UNSUPPORTED_MARK',
                message: 'Mark "link" was dropped because it did not contain a safe href.',
                path,
            });
            return null;
        }

        baseAttrs = {
            href,
        };

        const title = pickString(attrs, 'title');
        const target = pickString(attrs, 'target');
        const rel = pickString(attrs, 'rel');

        if (title) baseAttrs.title = title;
        if (target && ['_blank', '_self', '_parent', '_top'].includes(target)) {
            baseAttrs.target = target;
        }
        if (rel) baseAttrs.rel = rel;
    }

    if (mark.type === 'highlight') {
        const attrs = isRecord(mark.attrs) ? mark.attrs : {};
        const color = pickString(attrs, 'color');
        if (color) {
            baseAttrs = { color };
        }
    }

    if (mark.type === 'textStyle') {
        const attrs = isRecord(mark.attrs) ? mark.attrs : {};
        const color = pickString(attrs, 'color');
        if (color) {
            baseAttrs = { color };
        }
    }

    if (isCustomMark && !baseAttrs) {
        baseAttrs = sanitizeGenericAttrs(mark.attrs);
    }

    const customAttrs = sanitizeAttributesWithCustomPolicy('mark', mark.type, mark.attrs, options);
    if (customAttrs === null) {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_MARK',
            message: `Mark "${mark.type}" was dropped by its attribute sanitizer.`,
            path,
        });
        return null;
    }

    let attrs = mergeAttrs(baseAttrs, customAttrs ?? undefined);

    if (mark.type === 'link') {
        attrs = sanitizeLinkAttrs(attrs) ?? undefined;
        if (!attrs) {
            pushWarning(warnings, {
                code: 'UNSUPPORTED_MARK',
                message: 'Mark "link" was dropped because it did not contain a safe href.',
                path,
            });
            return null;
        }
    }

    if (mark.type === 'highlight' || mark.type === 'textStyle') {
        attrs = sanitizeColorMarkAttrs(attrs);
    }

    reportAttributeChanges(warnings, 'mark', mark.type, mark.attrs, attrs, path);

    if (attrs) {
        safeMark.attrs = attrs;
    }

    return safeMark;
}

function sanitizeMarks(
    marks: unknown,
    options: NormalizeEditorJsonOptions | undefined,
    warnings: EditorContentWarning[],
    path: JsonPath,
): EditorJsonMark[] | undefined {
    if (!Array.isArray(marks)) {
        return undefined;
    }

    const safeMarks = marks
        .map((mark, index) => sanitizeMark(mark, options, warnings, [...path, index]))
        .filter((mark): mark is EditorJsonMark => mark !== null);

    return safeMarks.length > 0 ? safeMarks : undefined;
}

function sanitizeImageAttrs(
    attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
    if (!attrs) {
        return null;
    }

    const src = sanitizeUrlAttr(attrs.src, MEDIA_URL_POLICY);
    if (!src) {
        return null;
    }

    const safeAttrs: Record<string, unknown> = {
        ...attrs,
        src,
    };

    const alt = pickString(attrs, 'alt');
    const title = pickString(attrs, 'title');
    const width = pickNumber(attrs, 'width');
    const height = pickNumber(attrs, 'height');

    if (alt) {
        safeAttrs.alt = alt;
    } else {
        delete safeAttrs.alt;
    }

    if (title) {
        safeAttrs.title = title;
    } else {
        delete safeAttrs.title;
    }

    if (width) {
        safeAttrs.width = width;
    } else {
        delete safeAttrs.width;
    }

    if (height) {
        safeAttrs.height = height;
    } else {
        delete safeAttrs.height;
    }

    return safeAttrs;
}

function sanitizeIframeAttrs(
    attrs: Record<string, unknown> | undefined,
    options: NormalizeEditorJsonOptions | undefined,
): Record<string, unknown> | null {
    if (
        !attrs ||
        typeof attrs.src !== 'string' ||
        !isAllowedIframeSrc(attrs.src, options?.iframe)
    ) {
        return null;
    }

    const src = sanitizeUrl(attrs.src, IFRAME_URL_POLICY);
    if (!src) {
        return null;
    }

    const safeAttrs: Record<string, unknown> = {
        ...attrs,
        src,
    };

    const title = pickString(attrs, 'title');
    const allow = pickString(attrs, 'allow');
    const loading = pickString(attrs, 'loading');

    if (title) {
        safeAttrs.title = title;
    } else {
        delete safeAttrs.title;
    }

    if (allow) {
        safeAttrs.allow = allow;
    } else {
        delete safeAttrs.allow;
    }

    if (loading && ['lazy', 'eager'].includes(loading)) {
        safeAttrs.loading = loading;
    } else {
        delete safeAttrs.loading;
    }

    if (typeof attrs.allowfullscreen === 'boolean') {
        safeAttrs.allowfullscreen = attrs.allowfullscreen;
    } else {
        delete safeAttrs.allowfullscreen;
    }

    return safeAttrs;
}

function sanitizeTaskItemAttrs(
    attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
    if (!attrs) {
        return undefined;
    }

    const safeAttrs = { ...attrs };
    if ('checked' in safeAttrs && typeof safeAttrs.checked !== 'boolean') {
        delete safeAttrs.checked;
    }

    return Object.keys(safeAttrs).length > 0 ? safeAttrs : undefined;
}

function normalizeNode(
    value: unknown,
    options: NormalizeEditorJsonOptions | undefined,
    warnings: EditorContentWarning[],
    path: JsonPath,
): EditorJsonContent[number] | null {
    if (!isRecord(value) || typeof value.type !== 'string') {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_NODE',
            message: 'A node without a valid type was dropped during normalization.',
            path,
        });
        return null;
    }

    const isCustomNode = isAllowedCustomType(value.type, options?.customNodeTypes);
    const isIframeNode = value.type === 'iframe' && options?.iframe?.enabled;
    const isConfiguredNode = isAllowedType(value.type, options?.allowedNodeTypes, ALLOWED_NODES);
    if (!isConfiguredNode && !isCustomNode && !isIframeNode) {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_NODE',
            message: `Node "${value.type}" is not enabled in the current schema.`,
            path,
        });
        return null;
    }

    if (value.type === 'iframe' && !isIframeNode && !isCustomNode) {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_NODE',
            message: 'Node "iframe" was dropped because iframe support is disabled.',
            path,
        });
        return null;
    }

    if (value.type === 'text') {
        if (typeof value.text !== 'string') {
            pushWarning(warnings, {
                code: 'UNSUPPORTED_NODE',
                message: 'Text node was dropped because its text value was invalid.',
                path,
            });
            return null;
        }

        const textNode: EditorJsonContent[number] = {
            type: 'text',
            text: value.text,
        };
        const marks = sanitizeMarks(value.marks, options, warnings, [...path, 'marks']);
        if (marks) {
            textNode.marks = marks;
        }

        return textNode;
    }

    const node: EditorJsonContent[number] = { type: value.type };

    const customAttrs = sanitizeAttributesWithCustomPolicy(
        'node',
        value.type,
        value.attrs,
        options,
    );
    if (customAttrs === null) {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_NODE',
            message: `Node "${value.type}" was dropped by its attribute sanitizer.`,
            path,
        });
        return null;
    }

    const baseAttrs = isCustomNode
        ? sanitizeGenericAttrs(value.attrs)
        : sanitizeNodeAttrs(value.type, value.attrs, options);
    let attrs = mergeAttrs(baseAttrs ?? undefined, customAttrs ?? undefined);

    if (isCustomNode && hasGenericUrlAttrs(value.attrs) && !hasSafeGenericUrlAttrs(attrs)) {
        pushWarning(warnings, {
            code: 'UNSUPPORTED_NODE',
            message: `Node "${value.type}" was dropped because it did not contain any safe URL attributes.`,
            path,
        });
        return null;
    }

    if (value.type === 'image') {
        attrs = sanitizeImageAttrs(attrs) ?? undefined;
        if (!attrs) {
            pushWarning(warnings, {
                code: 'UNSUPPORTED_NODE',
                message: 'Node "image" was dropped because it did not contain a safe src.',
                path,
            });
            return null;
        }
    }

    if (value.type === 'iframe' && !isCustomNode) {
        attrs = sanitizeIframeAttrs(attrs, options) ?? undefined;
        if (!attrs) {
            pushWarning(warnings, {
                code: 'UNSUPPORTED_NODE',
                message: 'Node "iframe" was dropped because it did not contain an allowed src.',
                path,
            });
            return null;
        }
    }

    if (value.type === 'taskItem') {
        attrs = sanitizeTaskItemAttrs(attrs);
    }

    reportAttributeChanges(warnings, 'node', value.type, value.attrs, attrs, path);

    if (attrs) {
        node.attrs = attrs;
    }

    if (Array.isArray(value.content)) {
        const content = value.content
            .map((child, index) =>
                normalizeNode(child, options, warnings, [...path, 'content', index]),
            )
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
    return normalizeEditorJsonWithReport(value, options).value;
}

export function normalizeEditorJsonWithReport(
    value: unknown,
    options?: NormalizeEditorJsonOptions,
): NormalizeEditorJsonResult {
    const warnings: EditorContentWarning[] = [];

    if (!isEditorJson(value)) {
        pushWarning(warnings, {
            code: 'INVALID_DOCUMENT',
            message:
                'Input was replaced with an empty editor document because it was not valid TipTap JSON.',
            path: [],
        });

        return {
            value: createEmptyDocument(),
            warnings,
            lossy: true,
        };
    }

    const normalized = normalizeNode(value, options, warnings, []);
    if (!normalized || normalized.type !== 'doc' || !normalized.content?.length) {
        if (warnings.length === 0) {
            pushWarning(warnings, {
                code: 'INVALID_DOCUMENT',
                message:
                    'Input was replaced with an empty editor document because it did not contain supported content.',
                path: [],
            });
        }

        return {
            value: createEmptyDocument(),
            warnings,
            lossy: warnings.length > 0,
        };
    }

    return {
        value: normalized,
        warnings,
        lossy: warnings.length > 0,
    };
}
