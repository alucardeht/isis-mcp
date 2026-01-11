import { ensurePlaywrightReady } from "./playwright/setup.js";
import { ensureSearxngRunning } from "./docker-searxng.js";
let startupComplete = false;
let startupError = null;
let startupPromise = null;
let cachedStatus = null;
function runBackgroundStartup() {
    startupPromise = (async () => {
        try {
            console.error("[isis-mcp] Running startup checks in background...");
            const results = await Promise.allSettled([
                ensurePlaywrightReady(),
                ensureSearxngRunning().catch(() => false),
                warmupBrowserPool().catch((err) => {
                    console.warn("[isis-mcp] Browser pool warmup failed (non-fatal):", err.message);
                }),
            ]);
            const playwrightResult = results[0].status === "fulfilled" ? results[0].value : false;
            const searxngResult = results[1].status === "fulfilled" ? results[1].value : false;
            cachedStatus = {
                playwright: playwrightResult,
                searxng: searxngResult,
                ready: playwrightResult,
            };
            console.error("[isis-mcp] Startup status:", JSON.stringify(cachedStatus, null, 2));
            if (!cachedStatus.ready) {
                console.error("[isis-mcp] WARNING: Some features may not work");
            }
            startupComplete = true;
        }
        catch (error) {
            startupError = error;
            console.error("[isis-mcp] Fatal startup error:", error);
            startupComplete = true;
        }
    })();
}
async function warmupBrowserPool() {
    try {
        const { getBrowserPool } = await import("./browser-pool.js");
        const pool = getBrowserPool();
        const { release } = await pool.acquire();
        release();
        console.error("[isis-mcp] Browser pool warmed up");
    }
    catch (error) {
        console.warn("[isis-mcp] Browser pool warmup skipped:", error.message);
    }
}
export function runStartupChecksAsync() {
    if (!startupPromise) {
        runBackgroundStartup();
    }
}
export async function waitForStartup() {
    if (startupPromise) {
        await startupPromise;
    }
}
export function isStartupComplete() {
    return startupComplete;
}
export function getStartupStatus() {
    return cachedStatus;
}
export async function getStartupStatusAwait() {
    if (!startupPromise) {
        runBackgroundStartup();
    }
    await waitForStartup();
    return (cachedStatus || {
        playwright: false,
        searxng: false,
        ready: false,
    });
}
export async function runStartupChecks() {
    return getStartupStatusAwait();
}
//# sourceMappingURL=startup.js.map