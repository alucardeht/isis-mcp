interface ScrapeParams {
    url: string;
    selector?: string;
    useJavascript?: boolean;
    timeout?: number;
    includeRawContent?: boolean;
}
interface ScrapeResult {
    url: string;
    title: string;
    markdown: string;
    content?: string;
    selectedContent?: string;
    fromCache: boolean;
    timestamp: string;
    contentTruncated?: boolean;
    originalLength?: number;
    error?: string;
}
export declare function scrape(params: ScrapeParams): Promise<ScrapeResult>;
export {};
//# sourceMappingURL=scrape.d.ts.map