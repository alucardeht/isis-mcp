import { LlamaEngine } from './llama-engine.js';

interface SummarizerConfig {
  model?: string;
  maxInputTokens?: number;
}

export class OllamaSummarizer {
  private engine: LlamaEngine;
  private maxInputTokens: number;

  constructor(config: SummarizerConfig = {}) {
    this.engine = LlamaEngine.getInstance({
      modelName: config.model || 'llama-3.2-1b-instruct-q4_k_m.gguf',
    });
    this.maxInputTokens = config.maxInputTokens || 2000;
  }

  async summarize(content: string): Promise<string | null> {
    try {
      const available = await this.engine.isAvailable();
      if (!available) {
        return null;
      }

      const truncated = content.substring(0, this.maxInputTokens * 4);
      return await this.engine.summarize(truncated);
    } catch (error) {
      console.error('Summarizer error:', error);
      return null;
    }
  }
}
