interface RagParams {
    query: string;
    maxResults?: number;
    outputFormat?: "markdown" | "text" | "html";
    contentMode?: "preview" | "full" | "summary";
    summaryModel?: string;
    useJavascript?: boolean;
    timeout?: number;
}
interface PageResult {
    url: string;
    title: string;
    markdown?: string;
    text?: string;
    html?: string;
    excerpt?: string;
    contentHandle?: string;
    fromCache: boolean;
}
interface RagResult {
    query: string;
    results: PageResult[];
    totalResults: number;
    searchedAt: string;
    error?: string;
}
export declare function rag(params: RagParams): Promise<RagResult>;
export {};
//# sourceMappingURL=rag.d.ts.map