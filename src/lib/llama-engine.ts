import { getLlama, LlamaChatSession, Llama, LlamaModel, LlamaContext } from 'node-llama-cpp';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface LlamaEngineConfig {
  modelName?: string;
  cacheDir?: string;
  maxTokens?: number;
}

export class LlamaEngine {
  private static instance: LlamaEngine;
  private llama: Llama | null = null;
  private model: LlamaModel | null = null;
  private modelPath: string;
  private cacheDir: string;
  private maxTokens: number;
  private modelName: string;
  private isDownloading: boolean = false;

  private constructor(config: LlamaEngineConfig = {}) {
    this.modelName = config.modelName || 'Llama-3.2-1B-Instruct-Q4_K_M.gguf';
    this.cacheDir = config.cacheDir || join(homedir(), '.cache', 'isis-mcp');
    this.modelPath = join(this.cacheDir, this.modelName);
    this.maxTokens = config.maxTokens || 250;

    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  static getInstance(config?: LlamaEngineConfig): LlamaEngine {
    if (!LlamaEngine.instance) {
      LlamaEngine.instance = new LlamaEngine(config);
    }
    return LlamaEngine.instance;
  }

  private async downloadModel(): Promise<void> {
    if (this.isDownloading) {
      console.log('⏳ Model download already in progress...');
      return;
    }

    this.isDownloading = true;
    console.log(`📥 Downloading ${this.modelName}...`);

    try {
      const modelUrl = `https://huggingface.co/lmstudio-community/Llama-3.2-1B-Instruct-GGUF/resolve/main/${this.modelName}`;

      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const totalSize = parseInt(response.headers.get('content-length') || '0');
      let downloaded = 0;
      let lastPercent = 0;

      const body = response.body;
      if (!body) throw new Error('No response body');

      const reader = body.getReader();
      const writer = createWriteStream(this.modelPath);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        writer.write(Buffer.from(value));
        downloaded += value.length;

        const percent = Math.floor((downloaded / totalSize) * 100);
        if (percent > lastPercent && percent % 10 === 0) {
          console.log(`📥 Preparando sumarização inteligente... ${percent}%`);
          lastPercent = percent;
        }
      }

      writer.end();
      console.log(`✅ Modelo ${this.modelName} pronto! Sumarização inteligente ativada.`);
    } catch (error) {
      console.error(`❌ Failed to download model: ${error}`);
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  private async ensureModel(): Promise<void> {
    if (!existsSync(this.modelPath)) {
      await this.downloadModel();
    }
  }

  private async loadModel(): Promise<LlamaModel> {
    if (this.model) {
      return this.model;
    }

    await this.ensureModel();

    console.log('🤖 Loading model into memory...');

    if (!this.llama) {
      this.llama = await getLlama();
    }

    this.model = await this.llama.loadModel({
      modelPath: this.modelPath,
      gpuLayers: 'auto',
    });

    return this.model;
  }

  async summarize(content: string): Promise<string | null> {
    try {
      const model = await this.loadModel();
      const context = await model.createContext();
      const sequence = context.getSequence();
      const session = new LlamaChatSession({
        contextSequence: sequence,
      });

      const prompt = `Summarize the following content concisely in 150-200 words, preserving the key facts and main insights:\n\n${content.substring(0, 8000)}\n\nSummary:`;

      const response = await session.prompt(prompt, {
        maxTokens: this.maxTokens,
        temperature: 0.3,
      });

      await context.dispose();

      return response.trim();
    } catch (error) {
      console.error('LlamaEngine summarization error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (existsSync(this.modelPath)) {
        return true;
      }
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.model) {
      await this.model.dispose();
      this.model = null;
    }
    if (this.llama) {
      await this.llama.dispose();
      this.llama = null;
    }
  }
}
