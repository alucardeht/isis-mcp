interface CacheEntry {
    url: string;
    content: string;
    markdown: string;
    title: string;
    cached_at: number;
}
export declare function getFromCache(url: string): CacheEntry | null;
export declare function saveToCache(url: string, data: {
    content: string;
    markdown: string;
    title: string;
}): void;
export declare function closeCache(): void;
export declare function generateContentHandle(url: string): string;
export declare function decodeContentHandle(handle: string): string | null;
export {};
//# sourceMappingURL=cache.d.ts.map