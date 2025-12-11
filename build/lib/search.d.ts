interface SearchResult {
    url: string;
    title: string;
    description: string;
}
export declare function searchWeb(query: string, maxResults?: number): Promise<SearchResult[]>;
export {};
//# sourceMappingURL=search.d.ts.map