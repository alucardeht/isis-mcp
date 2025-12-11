interface OllamaSummarizerConfig {
  endpoint?: string;
  model?: string;
  maxInputTokens?: number;
  timeout?: number;
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
}

export class OllamaSummarizer {
  private static isAvailable: boolean | null = null;
  private endpoint: string;
  private model: string;
  private maxInputTokens: number;
  private timeout: number;

  constructor(config: OllamaSummarizerConfig = {}) {
    this.endpoint = config.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2:1b';
    this.maxInputTokens = config.maxInputTokens || 2000;
    this.timeout = config.timeout || 30000;
  }

  async summarize(content: string): Promise<string | null> {
    try {
      if (!await this.isOllamaAvailable()) {
        return null;
      }

      const truncated = content.substring(0, this.maxInputTokens * 4);
      const prompt = `Summarize the following content concisely in 150-200 words, preserving the key facts and main insights:\n\n${truncated}\n\nSummary:`;

      const response = await this.callOllama(prompt);
      return response.response?.trim() || null;
    } catch (error) {
      console.error('Summarizer error:', error);
      return null;
    }
  }

  private async isOllamaAvailable(): Promise<boolean> {
    if (OllamaSummarizer.isAvailable !== null) {
      return OllamaSummarizer.isAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      OllamaSummarizer.isAvailable = response.ok;
      return response.ok;
    } catch {
      OllamaSummarizer.isAvailable = false;
      return false;
    }
  }

  private async callOllama(prompt: string): Promise<OllamaResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 250,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      return await response.json() as OllamaResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
