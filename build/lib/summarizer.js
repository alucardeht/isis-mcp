import { LlamaEngine } from './llama-engine.js';
export class OllamaSummarizer {
    engine;
    maxInputTokens;
    constructor(config = {}) {
        this.engine = LlamaEngine.getInstance({
            modelName: config.model || 'llama-3.2-1b-instruct-q4_k_m.gguf',
        });
        this.maxInputTokens = config.maxInputTokens || 2000;
    }
    async summarize(content) {
        try {
            const available = await this.engine.isAvailable();
            if (!available) {
                return null;
            }
            const truncated = content.substring(0, this.maxInputTokens * 4);
            return await this.engine.summarize(truncated);
        }
        catch (error) {
            console.error('Summarizer error:', error);
            return null;
        }
    }
}
//# sourceMappingURL=summarizer.js.map