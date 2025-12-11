interface FetchFullContentParams {
    contentHandle: string;
    outputFormat?: "markdown" | "text" | "html";
}
interface FetchResult {
    url: string;
    title: string;
    markdown?: string;
    text?: string;
    html?: string;
    contentLength?: number;
    cached?: boolean;
    error?: string;
}
export declare function fetchFullContent(params: FetchFullContentParams): Promise<FetchResult>;
export {};
//# sourceMappingURL=fetch.d.ts.map