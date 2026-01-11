interface LlamaEngineConfig {
    modelName?: string;
    cacheDir?: string;
    maxTokens?: number;
    modelIdleTtl?: number;
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
    private modelIdleTtl;
    private lastUsedAt;
    private unloadTimer;
    private constructor();
    static getInstance(config?: LlamaEngineConfig): LlamaEngine;
    private downloadModel;
    private ensureModel;
    private unloadModel;
    private resetUnloadTimer;
    private loadModel;
    summarize(content: string): Promise<string | null>;
    isAvailable(): Promise<boolean>;
    cleanup(): Promise<void>;
}
export declare function shutdownLlamaEngine(): Promise<void>;
export {};
//# sourceMappingURL=llama-engine.d.ts.map