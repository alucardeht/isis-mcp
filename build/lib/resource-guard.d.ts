/**
 * Resource Guard - Centralized resource validation and security
 * Prevents API crashes, resource exhaustion, and security vulnerabilities
 */
export declare const LIMITS: {
    readonly IMAGE_MAX_DIMENSION: 4096;
    readonly IMAGE_MAX_PIXELS: 8000000;
    readonly IMAGE_MAX_SIZE_BYTES: number;
    readonly CONTENT_MAX_PER_PAGE: 50000;
    readonly CONTENT_MAX_TOTAL: 200000;
    readonly HTML_MAX_SIZE: 5000000;
    readonly CACHE_MAX_ENTRIES: 500;
    readonly CACHE_MAX_SIZE_BYTES: number;
    readonly MAX_BROWSERS: 2;
    readonly MAX_REDIRECTS: 5;
    readonly PAGE_TIMEOUT: 30000;
    readonly MAX_CONCURRENT_SCRAPES: 5;
};
export interface UrlValidationResult {
    valid: boolean;
    url?: string;
    error?: string;
}
export declare function validateUrl(urlString: string): UrlValidationResult;
export interface ImageValidationResult {
    valid: boolean;
    shouldCapture: 'fullPage' | 'viewport' | 'clip';
    clipHeight?: number;
    useJpeg: boolean;
    jpegQuality: number;
    warning?: string;
}
export declare function validateImageDimensions(width: number, height: number, requestedFullPage: boolean): ImageValidationResult;
export interface TruncationResult {
    content: string;
    truncated: boolean;
    originalLength: number;
    truncatedAt?: number;
}
export declare function truncateContent(content: string, maxLength?: number): TruncationResult;
export declare function truncateHtml(html: string): TruncationResult;
export interface ResponseSizeResult {
    valid: boolean;
    sizeBytes: number;
    sizeFormatted: string;
    warning?: string;
}
export declare function validateResponseSize(response: unknown): ResponseSizeResult;
export declare class RedirectTracker {
    private redirects;
    track(url: string): boolean;
    reset(): void;
    getCount(url: string): number;
}
export declare function validateContentHandle(handle: string): boolean;
declare const _default: {
    LIMITS: {
        readonly IMAGE_MAX_DIMENSION: 4096;
        readonly IMAGE_MAX_PIXELS: 8000000;
        readonly IMAGE_MAX_SIZE_BYTES: number;
        readonly CONTENT_MAX_PER_PAGE: 50000;
        readonly CONTENT_MAX_TOTAL: 200000;
        readonly HTML_MAX_SIZE: 5000000;
        readonly CACHE_MAX_ENTRIES: 500;
        readonly CACHE_MAX_SIZE_BYTES: number;
        readonly MAX_BROWSERS: 2;
        readonly MAX_REDIRECTS: 5;
        readonly PAGE_TIMEOUT: 30000;
        readonly MAX_CONCURRENT_SCRAPES: 5;
    };
    validateUrl: typeof validateUrl;
    validateImageDimensions: typeof validateImageDimensions;
    truncateContent: typeof truncateContent;
    truncateHtml: typeof truncateHtml;
    validateResponseSize: typeof validateResponseSize;
    validateContentHandle: typeof validateContentHandle;
    RedirectTracker: typeof RedirectTracker;
};
export default _default;
//# sourceMappingURL=resource-guard.d.ts.map