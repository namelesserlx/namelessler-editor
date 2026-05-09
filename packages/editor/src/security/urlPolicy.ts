import type { UrlPolicy } from './types';

const DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

const BARE_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

function normalizePolicy(policy?: UrlPolicy): Required<UrlPolicy> {
    return {
        allowedProtocols: policy?.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS,
        allowRelativeUrls: policy?.allowRelativeUrls ?? true,
        allowProtocolRelativeUrls: policy?.allowProtocolRelativeUrls ?? false,
        allowDataImageUrls: policy?.allowDataImageUrls ?? false,
    };
}

function isDataImageUrl(value: string): boolean {
    return /^data:image\/(?:png|gif|jpe?g|webp|avif|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value);
}

function isRelativeUrl(value: string): boolean {
    return value.startsWith('/') || value.startsWith('#');
}

function hasControlCharacters(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const charCode = value.charCodeAt(index);
        if (charCode <= 0x1f || charCode === 0x7f) {
            return true;
        }
    }

    return false;
}

export function sanitizeUrl(input: string, policy?: UrlPolicy): string | null {
    const resolvedPolicy = normalizePolicy(policy);
    const trimmed = input.trim();

    if (!trimmed || hasControlCharacters(trimmed)) {
        return null;
    }

    if (trimmed.startsWith('//')) {
        if (!resolvedPolicy.allowProtocolRelativeUrls) {
            return null;
        }

        return sanitizeUrl(`https:${trimmed}`, policy);
    }

    if (trimmed.startsWith('data:')) {
        return resolvedPolicy.allowDataImageUrls && isDataImageUrl(trimmed) ? trimmed : null;
    }

    if (isRelativeUrl(trimmed)) {
        return resolvedPolicy.allowRelativeUrls ? trimmed : null;
    }

    const candidate = BARE_DOMAIN_PATTERN.test(trimmed) ? `https://${trimmed}` : trimmed;

    try {
        const url = new URL(candidate);
        if (!resolvedPolicy.allowedProtocols.includes(url.protocol)) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

export function isSafeUrl(input: string, policy?: UrlPolicy): boolean {
    return sanitizeUrl(input, policy) !== null;
}
