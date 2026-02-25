import { exec, execSync } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const execAsync = promisify(exec);
const CONTAINER_NAME = "isis-searxng";
const SEARXNG_PORT = 8080;
const HEALTH_CHECK_TIMEOUT = 30000; // 30 segundos para container ficar ready

const DEFAULT_SEARXNG_SETTINGS = `use_default_settings: true

general:
  instance_name: "ISIS-MCP SearXNG"

search:
  formats:
    - html
    - json
  safe_search: 0
  autocomplete: ""

server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "isis-mcp-local-key-12345"
  limiter: false
  image_proxy: false

enabled_plugins: []

redis:
  url: false
`;

function log(message: string): void {
  console.warn(`[Docker] ${message}`);
}

async function isDockerRunning(): Promise<boolean> {
  try {
    await execAsync("docker ps");
    return true;
  } catch {
    return false;
  }
}

async function tryStartDocker(): Promise<boolean> {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      log("Docker: Starting Docker Desktop...");
      execSync("open -a Docker", { timeout: 5000 });
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (await isDockerRunning()) {
          log("Docker: Started successfully");
          return true;
        }
      }
    } else if (platform === "linux") {
      log("Docker: Starting Docker service...");
      execSync("sudo systemctl start docker", { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 3000));
      return await isDockerRunning();
    } else if (platform === "win32") {
      log("Docker: Starting Docker Desktop...");
      const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
      const localAppData = process.env.LOCALAPPDATA || "";
      const candidates = [
        join(programFiles, "Docker", "Docker", "Docker Desktop.exe"),
        join(localAppData, "Docker", "Docker Desktop.exe"),
      ];
      const dockerPath = candidates.find((p) => existsSync(p));
      if (!dockerPath) return false;
      try {
        execSync(`cmd.exe /c start "" "${dockerPath}"`, { stdio: "ignore" });
      } catch {
        return false;
      }
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (await isDockerRunning()) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker --version");
    return true;
  } catch {
    return false;
  }
}

async function isContainerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter name=${CONTAINER_NAME} --filter status=running --format "{{.Names}}"`
    );
    return stdout.trim() === CONTAINER_NAME;
  } catch {
    return false;
  }
}

async function containerExists(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter name=${CONTAINER_NAME} --format "{{.Names}}"`
    );
    return stdout.trim() === CONTAINER_NAME;
  } catch {
    return false;
  }
}

async function startExistingContainer(): Promise<boolean> {
  try {
    log(`Starting existing container ${CONTAINER_NAME}...`);
    await execAsync(`docker start ${CONTAINER_NAME}`);
    return true;
  } catch (error) {
    log(`Failed to start existing container: ${(error as Error).message}`);
    return false;
  }
}

function toDockerPath(p: string): string {
  return p.replace(/\\/g, "/");
}

async function createAndStartContainer(): Promise<boolean> {
  try {
    log(`Creating and starting new SearXNG container...`);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectDir = dirname(dirname(__dirname));
    const rawSettingsPath = join(projectDir, "docker", "searxng", "settings.yml");

    if (!existsSync(rawSettingsPath)) {
      log(`Settings file not found at: ${rawSettingsPath}`);
      log(`Creating default settings...`);
      const { mkdirSync, writeFileSync } = await import("fs");
      const settingsDir = dirname(rawSettingsPath);
      mkdirSync(settingsDir, { recursive: true });
      writeFileSync(rawSettingsPath, DEFAULT_SEARXNG_SETTINGS, "utf-8");
      log(`Default settings created at: ${rawSettingsPath}`);
    }

    const settingsPath = toDockerPath(rawSettingsPath);

    await execAsync(
      `docker run -d --name ${CONTAINER_NAME} -p ${SEARXNG_PORT}:8080 -v "${settingsPath}":/etc/searxng/settings.yml:ro searxng/searxng`
    );
    return true;
  } catch (error) {
    log(`Failed to create container: ${(error as Error).message}`);
    return false;
  }
}

async function waitForHealthy(): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 1000; // 1 segundo

  log(`Waiting for SearXNG to be ready (timeout: ${HEALTH_CHECK_TIMEOUT / 1000}s)...`);

  while (Date.now() - startTime < HEALTH_CHECK_TIMEOUT) {
    try {
      const response = await fetch(`http://localhost:${SEARXNG_PORT}/`);
      if (response.ok) {
        log(`SearXNG is ready!`);
        return true;
      }
    } catch {
      // Container ainda não está pronto
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  log(`Timeout waiting for SearXNG to be ready`);
  return false;
}

export async function ensureSearxngRunning(): Promise<boolean> {
  log("Checking SearXNG availability...");

  // 1. Verificar se Docker está disponível
  if (!(await isDockerAvailable())) {
    log("Docker is not available. Attempting to start...");
    if (!(await tryStartDocker())) {
      log("Could not start Docker");
      return false;
    }
  }

  // 2. Se container já está rodando, verificar saúde
  if (await isContainerRunning()) {
    log(`Container ${CONTAINER_NAME} is already running`);
    return await waitForHealthy();
  }

  // 3. Se container existe mas está parado, iniciar
  if (await containerExists()) {
    if (await startExistingContainer()) {
      return await waitForHealthy();
    }
    return false;
  }

  // 4. Criar novo container
  if (await createAndStartContainer()) {
    return await waitForHealthy();
  }

  return false;
}

export async function stopSearxng(): Promise<void> {
  try {
    log(`Stopping container ${CONTAINER_NAME}...`);
    await execAsync(`docker stop ${CONTAINER_NAME}`);
    log(`Container stopped`);
  } catch (error) {
    log(`Failed to stop container: ${(error as Error).message}`);
  }
}

export async function removeSearxng(): Promise<void> {
  try {
    await stopSearxng();
    log(`Removing container ${CONTAINER_NAME}...`);
    await execAsync(`docker rm ${CONTAINER_NAME}`);
    log(`Container removed`);
  } catch (error) {
    log(`Failed to remove container: ${(error as Error).message}`);
  }
}
