import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execAsync = promisify(exec);
const CONTAINER_NAME = "isis-searxng";
const SEARXNG_PORT = 8080;
const HEALTH_CHECK_TIMEOUT = 30000; // 30 segundos para container ficar ready

function log(message: string): void {
  console.warn(`[Docker] ${message}`);
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

async function createAndStartContainer(): Promise<boolean> {
  try {
    log(`Creating and starting new SearXNG container...`);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectDir = dirname(dirname(dirname(__dirname)));
    const settingsPath = `${projectDir}/docker/searxng/settings.yml`;

    await execAsync(
      `docker run -d --name ${CONTAINER_NAME} -p ${SEARXNG_PORT}:8080 -v ${settingsPath}:/etc/searxng/settings.yml:ro searxng/searxng`
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
    log("Docker is not available");
    return false;
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
