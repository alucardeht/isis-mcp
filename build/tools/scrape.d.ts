interface ScrapeParams {
    url: string;
    selector?: string;
    javascript?: boolean;
    timeout?: number;
}
interface ScrapeResult {
    url: string;
    title: string;
    content: string;
    markdown: string;
    selectedContent?: string;
    fromCache: boolean;
    timestamp: string;
}
export declare function scrape(params: ScrapeParams): Promise<ScrapeResult>;
export {};
//# sourceMappingURL=scrape.d.ts.map