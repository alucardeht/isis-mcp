import { exec, execSync } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";
const execAsync = promisify(exec);
const CONTAINER_NAME = "isis-searxng";
const SEARXNG_PORT = 8080;
const HEALTH_CHECK_TIMEOUT = 30000; // 30 segundos para container ficar ready
function log(message) {
    console.warn(`[Docker] ${message}`);
}
async function isDockerRunning() {
    try {
        await execAsync("docker ps");
        return true;
    }
    catch {
        return false;
    }
}
async function tryStartDocker() {
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
        }
        else if (platform === "linux") {
            log("Docker: Starting Docker service...");
            execSync("sudo systemctl start docker", { timeout: 10000 });
            await new Promise((r) => setTimeout(r, 3000));
            return await isDockerRunning();
        }
        return false;
    }
    catch {
        return false;
    }
}
async function isDockerAvailable() {
    try {
        await execAsync("docker --version");
        return true;
    }
    catch {
        return false;
    }
}
async function isContainerRunning() {
    try {
        const { stdout } = await execAsync(`docker ps --filter name=${CONTAINER_NAME} --filter status=running --format "{{.Names}}"`);
        return stdout.trim() === CONTAINER_NAME;
    }
    catch {
        return false;
    }
}
async function containerExists() {
    try {
        const { stdout } = await execAsync(`docker ps -a --filter name=${CONTAINER_NAME} --format "{{.Names}}"`);
        return stdout.trim() === CONTAINER_NAME;
    }
    catch {
        return false;
    }
}
async function startExistingContainer() {
    try {
        log(`Starting existing container ${CONTAINER_NAME}...`);
        await execAsync(`docker start ${CONTAINER_NAME}`);
        return true;
    }
    catch (error) {
        log(`Failed to start existing container: ${error.message}`);
        return false;
    }
}
async function createAndStartContainer() {
    try {
        log(`Creating and starting new SearXNG container...`);
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const projectDir = dirname(dirname(dirname(__dirname)));
        const settingsPath = `${projectDir}/docker/searxng/settings.yml`;
        await execAsync(`docker run -d --name ${CONTAINER_NAME} -p ${SEARXNG_PORT}:8080 -v ${settingsPath}:/etc/searxng/settings.yml:ro searxng/searxng`);
        return true;
    }
    catch (error) {
        log(`Failed to create container: ${error.message}`);
        return false;
    }
}
async function waitForHealthy() {
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
        }
        catch {
            // Container ainda não está pronto
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
    log(`Timeout waiting for SearXNG to be ready`);
    return false;
}
export async function ensureSearxngRunning() {
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
export async function stopSearxng() {
    try {
        log(`Stopping container ${CONTAINER_NAME}...`);
        await execAsync(`docker stop ${CONTAINER_NAME}`);
        log(`Container stopped`);
    }
    catch (error) {
        log(`Failed to stop container: ${error.message}`);
    }
}
export async function removeSearxng() {
    try {
        await stopSearxng();
        log(`Removing container ${CONTAINER_NAME}...`);
        await execAsync(`docker rm ${CONTAINER_NAME}`);
        log(`Container removed`);
    }
    catch (error) {
        log(`Failed to remove container: ${error.message}`);
    }
}
//# sourceMappingURL=docker-searxng.js.map