interface SummarizerConfig {
    model?: string;
    maxInputTokens?: number;
}
export declare class OllamaSummarizer {
    private engine;
    private maxInputTokens;
    constructor(config?: SummarizerConfig);
    summarize(content: string): Promise<string | null>;
}
export {};
//# sourceMappingURL=summarizer.d.ts.map