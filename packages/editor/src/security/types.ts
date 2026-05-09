export interface UrlPolicy {
    allowedProtocols?: string[];
    allowRelativeUrls?: boolean;
    allowProtocolRelativeUrls?: boolean;
    allowDataImageUrls?: boolean;
}

export interface HtmlIframePolicy {
    enabled?: boolean;
    allowedHosts?: string[];
}

export interface HtmlPolicy {
    iframe?: HtmlIframePolicy;
}
