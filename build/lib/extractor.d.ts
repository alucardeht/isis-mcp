interface ExtractedContent {
    title: string;
    content: string;
    textContent: string;
    markdown: string;
    excerpt: string;
    byline: string;
    length: number;
}
export declare function extractContent(html: string, url: string): Promise<ExtractedContent | null>;
export {};
//# sourceMappingURL=extractor.d.ts.map