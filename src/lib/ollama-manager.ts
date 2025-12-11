import { spawn, exec, ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OllamaState {
  ollamaInstalled: boolean;
  modelDownloaded: boolean;
  lastCheck: number;
  pid?: number;
}

export class OllamaManager {
  private static instance: OllamaManager;
  private ollamaProcess: ChildProcess | null = null;
  private statePath = join(homedir(), '.isis-mcp-state.json');
  private isInstalling = false;

  static getInstance(): OllamaManager {
    if (!OllamaManager.instance) {
      OllamaManager.instance = new OllamaManager();
    }
    return OllamaManager.instance;
  }

  private loadState(): OllamaState {
    if (!existsSync(this.statePath)) {
      return {
        ollamaInstalled: false,
        modelDownloaded: false,
        lastCheck: 0,
      };
    }

    try {
      const data = readFileSync(this.statePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        ollamaInstalled: false,
        modelDownloaded: false,
        lastCheck: 0,
      };
    }
  }

  private saveState(state: Partial<OllamaState>): void {
    try {
      const dir = homedir();
      const current = this.loadState();
      const updated = { ...current, ...state, lastCheck: Date.now() };
      writeFileSync(this.statePath, JSON.stringify(updated, null, 2));
    } catch (error) {
      console.warn(
        `⚠️ Falha ao salvar estado Ollama: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async isOllamaInstalled(): Promise<boolean> {
    try {
      await execAsync('which ollama');
      return true;
    } catch {
      return false;
    }
  }

  async installOllama(): Promise<void> {
    if (this.isInstalling) {
      return;
    }

    this.isInstalling = true;

    try {
      const isMac = platform() === 'darwin';

      if (isMac) {
        console.log('📦 Instalando Ollama via Homebrew...');
        try {
          await execAsync('which brew');
        } catch {
          console.log('📦 Instalando Homebrew primeiro...');
          const installScript =
            '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
          await execAsync(installScript);
        }

        await execAsync('brew install ollama');
      } else {
        console.log('📦 Instalando Ollama via script oficial...');
        const installScript = 'curl -fsSL https://ollama.ai/install.sh | sh';
        await execAsync(installScript);
      }

      this.saveState({ ollamaInstalled: true });
      console.log('✅ Ollama instalado com sucesso');
    } catch (error) {
      throw new Error(
        `Falha na instalação do Ollama: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.isInstalling = false;
    }
  }

  async isOllamaRunning(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  async startOllama(): Promise<void> {
    if (await this.isOllamaRunning()) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const process = spawn('ollama', ['serve'], {
          detached: true,
          stdio: 'ignore',
        });

        process.unref();
        this.ollamaProcess = process;
        this.saveState({ pid: process.pid });

        setTimeout(() => {
          this.isOllamaRunning()
            .then((running) => {
              if (running) {
                resolve();
              } else {
                reject(new Error('Ollama failed to start'));
              }
            })
            .catch(reject);
        }, 3000);
      } catch (error) {
        reject(
          new Error(
            `Falha ao iniciar Ollama: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  async stopOllama(): Promise<void> {
    if (this.ollamaProcess) {
      try {
        process.kill(-this.ollamaProcess.pid!, 'SIGTERM');
      } catch {
      }
      this.ollamaProcess = null;
    }

    try {
      const state = this.loadState();
      if (state.pid) {
        process.kill(state.pid, 'SIGTERM');
      }
    } catch {
    }

    this.saveState({ pid: undefined });
  }

  async hasModel(model: string): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models || [];

      return models.some((m) => m.name.startsWith(model.split(':')[0]));
    } catch {
      return false;
    }
  }

  async pullModel(
    model: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('ollama', ['pull', model]);

      let buffer = '';

      process.stdout?.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          const match = line.match(/(\d+)%/);
          if (match && onProgress) {
            const percent = parseInt(match[1], 10);
            onProgress(percent);
          }
        }

        buffer = lines[lines.length - 1];
      });

      process.stderr?.on('data', (data: Buffer) => {
        console.warn(`⚠️ Ollama pull error: ${data.toString()}`);
      });

      process.on('error', (error) => {
        reject(
          new Error(
            `Falha ao fazer pull do modelo: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.saveState({ modelDownloaded: true });
          resolve();
        } else {
          reject(new Error(`Ollama pull exited with code ${code}`));
        }
      });
    });
  }

  getOllamaProcess(): ChildProcess | null {
    return this.ollamaProcess;
  }
}
