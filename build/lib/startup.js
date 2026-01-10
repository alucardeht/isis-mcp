import { ensurePlaywrightReady } from "./playwright/setup.js";
import { ensureSearxngRunning } from "./docker-searxng.js";
export async function runStartupChecks() {
    console.error("[isis-mcp] Running startup checks...");
    const [playwright, searxng] = await Promise.all([
        ensurePlaywrightReady(),
        ensureSearxngRunning().catch(() => false),
    ]);
    const status = {
        playwright,
        searxng,
        ready: playwright,
    };
    console.error("[isis-mcp] Startup status:", JSON.stringify(status, null, 2));
    if (!status.ready) {
        console.error("[isis-mcp] WARNING: Some features may not work");
    }
    return status;
}
//# sourceMappingURL=startup.js.map