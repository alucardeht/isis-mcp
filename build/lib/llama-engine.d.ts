interface LlamaEngineConfig {
    modelName?: string;
    cacheDir?: string;
    maxTokens?: number;
}
export declare class LlamaEngine {
    private static instance;
    private llama;
    private model;
    private modelPath;
    private cacheDir;
    private maxTokens;
    private modelName;
    private isDownloading;
    private constructor();
    static getInstance(config?: LlamaEngineConfig): LlamaEngine;
    private downloadModel;
    private ensureModel;
    private loadModel;
    summarize(content: string): Promise<string | null>;
    isAvailable(): Promise<boolean>;
    cleanup(): Promise<void>;
}
export {};
//# sourceMappingURL=llama-engine.d.ts.map