import { describe, expect, it } from 'vitest';
import { isSafeUrl, sanitizeUrl } from '../../src/security/urlPolicy';

describe('urlPolicy', () => {
    it('allows safe absolute and relative URLs by default', () => {
        expect(sanitizeUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
        expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
        expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
        expect(sanitizeUrl('/articles/1')).toBe('/articles/1');
        expect(sanitizeUrl('#comments')).toBe('#comments');
    });

    it('normalizes bare domains to https URLs', () => {
        expect(sanitizeUrl('example.com/docs')).toBe('https://example.com/docs');
    });

    it('blocks dangerous URLs by default', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
        expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
        expect(sanitizeUrl('//evil.example/path')).toBeNull();
        expect(sanitizeUrl('https://example.com/\u0000evil')).toBeNull();
        expect(sanitizeUrl('')).toBeNull();
        expect(sanitizeUrl('   ')).toBeNull();
    });

    it('allows data image URLs only when explicitly enabled', () => {
        const imageUrl = 'data:image/png;base64,aGVsbG8=';

        expect(sanitizeUrl(imageUrl)).toBeNull();
        expect(sanitizeUrl(imageUrl, { allowDataImageUrls: true })).toBe(imageUrl);
        expect(
            sanitizeUrl('data:text/html,<script>alert(1)</script>', {
                allowDataImageUrls: true,
            }),
        ).toBeNull();
    });

    it('respects custom allowed protocols and relative URL settings', () => {
        expect(sanitizeUrl('/internal', { allowRelativeUrls: false })).toBeNull();
        expect(
            sanitizeUrl('tel:+123456789', {
                allowedProtocols: ['https:', 'tel:'],
            }),
        ).toBe('tel:+123456789');
    });

    it('exposes a boolean safety check', () => {
        expect(isSafeUrl('https://example.com')).toBe(true);
        expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });
});
