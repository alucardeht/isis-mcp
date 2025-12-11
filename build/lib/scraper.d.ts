interface ScrapeResult {
    html: string;
    status: number;
}
export declare function scrapePage(url: string, options?: {
    javascript?: boolean;
    timeout?: number;
}): Promise<ScrapeResult>;
export {};
//# sourceMappingURL=scraper.d.ts.map