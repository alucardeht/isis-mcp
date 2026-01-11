import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
export class LlamaEngine {
    static instance;
    llama = null;
    model = null;
    modelPath;
    cacheDir;
    maxTokens;
    modelName;
    isDownloading = false;
    modelIdleTtl;
    lastUsedAt = 0;
    unloadTimer = null;
    constructor(config = {}) {
        this.modelName = config.modelName || 'Llama-3.2-1B-Instruct-Q4_K_M.gguf';
        this.cacheDir = config.cacheDir || join(homedir(), '.cache', 'isis-mcp');
        this.modelPath = join(this.cacheDir, this.modelName);
        this.maxTokens = config.maxTokens || 250;
        this.modelIdleTtl = config.modelIdleTtl || parseInt(process.env.MODEL_IDLE_TTL || '300000');
        if (!existsSync(this.cacheDir)) {
            mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    static getInstance(config) {
        if (!LlamaEngine.instance) {
            LlamaEngine.instance = new LlamaEngine(config);
        }
        return LlamaEngine.instance;
    }
    async downloadModel() {
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
            if (!body)
                throw new Error('No response body');
            const reader = body.getReader();
            const writer = createWriteStream(this.modelPath);
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
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
        }
        catch (error) {
            console.error(`❌ Failed to download model: ${error}`);
            throw error;
        }
        finally {
            this.isDownloading = false;
        }
    }
    async ensureModel() {
        if (!existsSync(this.modelPath)) {
            await this.downloadModel();
        }
    }
    async unloadModel() {
        if (this.model) {
            console.log('[LlamaEngine] Unloading model due to inactivity...');
            await this.model.dispose();
            this.model = null;
        }
        if (this.llama) {
            await this.llama.dispose();
            this.llama = null;
        }
        console.log('[LlamaEngine] Model unloaded, memory freed');
    }
    resetUnloadTimer() {
        this.lastUsedAt = Date.now();
        if (this.unloadTimer) {
            clearTimeout(this.unloadTimer);
        }
        this.unloadTimer = setTimeout(async () => {
            const idleTime = Date.now() - this.lastUsedAt;
            if (idleTime >= this.modelIdleTtl && this.model) {
                await this.unloadModel();
            }
        }, this.modelIdleTtl);
    }
    async loadModel() {
        if (this.model) {
            this.resetUnloadTimer();
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
        this.resetUnloadTimer();
        return this.model;
    }
    async summarize(content) {
        try {
            this.resetUnloadTimer();
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
        }
        catch (error) {
            console.error('LlamaEngine summarization error:', error);
            return null;
        }
    }
    async isAvailable() {
        try {
            if (existsSync(this.modelPath)) {
                return true;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async cleanup() {
        if (this.unloadTimer) {
            clearTimeout(this.unloadTimer);
            this.unloadTimer = null;
        }
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
export async function shutdownLlamaEngine() {
    const engine = LlamaEngine.getInstance();
    await engine.cleanup();
    console.log('[LlamaEngine] Shutdown complete');
}
if (typeof process !== 'undefined' && process.on) {
    process.on('exit', () => {
        const engine = LlamaEngine.getInstance();
        engine.cleanup().catch((err) => console.error('[LlamaEngine] Cleanup error on exit:', err));
    });
}
//# sourceMappingURL=llama-engine.js.map