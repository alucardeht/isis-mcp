import { ensurePlaywrightReady } from "./playwright/setup.js";
import { ensureSearxngRunning } from "./docker-searxng.js";

export interface StartupStatus {
  playwright: boolean;
  searxng: boolean;
  ready: boolean;
}

let startupComplete = false;
let startupError: Error | null = null;
let startupPromise: Promise<void> | null = null;
let cachedStatus: StartupStatus | null = null;

function runBackgroundStartup(): void {
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

      const playwrightResult =
        results[0].status === "fulfilled" ? results[0].value : false;
      const searxngResult =
        results[1].status === "fulfilled" ? results[1].value : false;

      cachedStatus = {
        playwright: playwrightResult,
        searxng: searxngResult,
        ready: playwrightResult,
      };

      console.error(
        "[isis-mcp] Startup status:",
        JSON.stringify(cachedStatus, null, 2)
      );

      if (!cachedStatus.ready) {
        console.error("[isis-mcp] WARNING: Some features may not work");
      }

      startupComplete = true;
    } catch (error) {
      startupError = error as Error;
      console.error("[isis-mcp] Fatal startup error:", error);
      startupComplete = true;
    }
  })();
}

async function warmupBrowserPool(): Promise<void> {
  try {
    const { getBrowserPool } = await import("./browser-pool.js");
    const pool = getBrowserPool();
    const { release } = await pool.acquire();
    release();
    console.error("[isis-mcp] Browser pool warmed up");
  } catch (error) {
    console.warn("[isis-mcp] Browser pool warmup skipped:", (error as Error).message);
  }
}

export function runStartupChecksAsync(): void {
  if (!startupPromise) {
    runBackgroundStartup();
  }
}

export async function waitForStartup(): Promise<void> {
  if (startupPromise) {
    await startupPromise;
  }
}

export function isStartupComplete(): boolean {
  return startupComplete;
}

export function getStartupStatus(): StartupStatus | null {
  return cachedStatus;
}

export async function getStartupStatusAwait(): Promise<StartupStatus> {
  if (!startupPromise) {
    runBackgroundStartup();
  }

  await waitForStartup();

  return (
    cachedStatus || {
      playwright: false,
      searxng: false,
      ready: false,
    }
  );
}

export async function runStartupChecks(): Promise<StartupStatus> {
  return getStartupStatusAwait();
}
