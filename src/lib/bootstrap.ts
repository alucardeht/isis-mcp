import { OllamaManager } from './ollama-manager.js';

export interface BootstrapConfig {
  model?: string;
  autoInstall?: boolean;
  verbose?: boolean;
}

export async function bootstrapOllama(config: BootstrapConfig = {}): Promise<void> {
  const manager = OllamaManager.getInstance();
  const model = config.model || process.env.OLLAMA_MODEL || 'llama3.2:1b';
  const autoInstall = config.autoInstall !== false;
  const verbose = config.verbose !== false;

  if (verbose) {
    console.log('🚀 isis-mcp iniciando...');
  }

  try {
    const installed = await manager.isOllamaInstalled();

    if (!installed) {
      if (autoInstall) {
        console.log('📦 Ollama não detectado - instalando automaticamente...');
        await manager.installOllama();
        console.log('✅ Ollama instalado');
      } else {
        throw new Error('Ollama não está instalado e autoInstall está desabilitado');
      }
    }

    const running = await manager.isOllamaRunning();

    if (!running) {
      console.log('🔄 Iniciando serviço Ollama...');
      await manager.startOllama();

      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('✅ Serviço Ollama iniciado');
    } else if (verbose) {
      console.log('✅ Ollama já está rodando');
    }

    const hasModel = await manager.hasModel(model);

    if (!hasModel) {
      console.log(`📥 Baixando modelo ${model} em background...`);

      manager
        .pullModel(model, (percent) => {
          console.log(`📥 Preparando sumarização inteligente... ${percent}%`);
        })
        .then(() => {
          console.log(
            `✅ Modelo ${model} pronto! Sumarização inteligente ativada.`
          );
        })
        .catch((err) => {
          console.warn(
            `⚠️ Falha ao baixar modelo: ${err instanceof Error ? err.message : String(err)}`
          );
        });

      console.log(
        '✅ isis-mcp pronto! (sumarização em modo fallback até modelo terminar)'
      );
    } else {
      if (verbose) {
        console.log(`✅ Modelo ${model} já disponível`);
      }
      console.log('✅ isis-mcp pronto!');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Erro no bootstrap: ${errorMessage}`);

    if (config.autoInstall === false) {
      throw error;
    }

    console.warn(
      '⚠️ isis-mcp iniciando em modo degradado (sem sumarização de IA)'
    );
  }
}

export async function shutdownOllama(): Promise<void> {
  const manager = OllamaManager.getInstance();

  try {
    if (await manager.isOllamaRunning()) {
      console.log('🛑 Parando serviço Ollama...');
      await manager.stopOllama();
      console.log('✅ Ollama parado');
    }
  } catch (error) {
    console.warn(
      `⚠️ Erro ao parar Ollama: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
