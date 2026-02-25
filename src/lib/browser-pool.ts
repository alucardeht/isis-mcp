import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as fs from "fs";

const MAX_BROWSERS = parseInt(process.env.MAX_BROWSERS ?? "2", 10);
const MAX_IDLE_TIME = parseInt(process.env.MAX_IDLE_TIME ?? "30000", 10);
const ACQUIRE_TIMEOUT = parseInt(process.env.ACQUIRE_TIMEOUT ?? "10000", 10);
const MAX_PAGES_PER_BROWSER = 3;

const isDocker =
  process.env.DOCKER === "true" || fs.existsSync("/.dockerenv");

interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  availablePages: Page[];
  inUsePages: Set<Page>;
  lastUsed: number;
  idleTimer: NodeJS.Timeout | null;
}

interface BrowserPoolStats {
  total: number;
  available: number;
  inUse: number;
}

interface AcquiredBrowser {
  browser: Browser;
  page: Page;
  release: () => Promise<void>;
}

class BrowserPool {
  private available: BrowserInstance[] = [];
  private inUse: Set<BrowserInstance> = new Set();
  private acquireQueue: Array<{
    resolve: (browser: AcquiredBrowser) => void;
    reject: (error: Error) => void;
  }> = [];

  private constructor() {
    this.setupProcessCleanup();
  }

  private static instance: BrowserPool | null = null;

  static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  async acquire(): Promise<AcquiredBrowser> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.acquireQueue.indexOf(request);
        if (index !== -1) {
          this.acquireQueue.splice(index, 1);
        }
        reject(new Error(`Browser acquisition timeout after ${ACQUIRE_TIMEOUT}ms`));
      }, ACQUIRE_TIMEOUT);

      const request = {
        resolve: (browser: AcquiredBrowser) => {
          clearTimeout(timeoutId);
          resolve(browser);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      };

      this.acquireQueue.push(request);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    while (this.acquireQueue.length > 0) {
      const browserInstance = await this.getBrowserInstance();
      if (!browserInstance) {
        break;
      }

      const request = this.acquireQueue.shift();
      if (!request) break;

      const page = await this.getOrCreatePage(browserInstance);
      if (!page) {
        request.reject(new Error("Failed to create page"));
        continue;
      }

      const { browser, idleTimer } = browserInstance;

      if (idleTimer) {
        clearTimeout(idleTimer);
      }

      browserInstance.inUsePages.add(page);

      const release = async () => {
        browserInstance.inUsePages.delete(page);

        try {
          await this.cleanPageState(page);
          browserInstance.availablePages.push(page);
        } catch (error) {
          console.error("[BrowserPool] Error cleaning page state:", error);
          try {
            await page.close();
          } catch (closeError) {
            console.error("[BrowserPool] Error closing page:", closeError);
          }
        }

        if (browserInstance.inUsePages.size === 0) {
          this.inUse.delete(browserInstance);
          browserInstance.lastUsed = Date.now();

          if (browserInstance.idleTimer) {
            clearTimeout(browserInstance.idleTimer);
          }
          browserInstance.idleTimer = setTimeout(async () => {
            try {
              const index = this.available.indexOf(browserInstance);
              if (index !== -1) {
                this.available.splice(index, 1);
              }
              for (const p of browserInstance.availablePages) {
                try { await p.close(); } catch {}
              }
              browserInstance.availablePages = [];
              await browserInstance.context.close();
              await browserInstance.browser.close();
              console.log(
                `[BrowserPool] Closed idle browser. Available: ${this.available.length}, InUse: ${this.inUse.size}`
              );
            } catch (error) {
              console.error("[BrowserPool] Error closing idle browser:", error);
            }
          }, MAX_IDLE_TIME);

          this.available.push(browserInstance);
        }

        this.processQueue();
      };

      request.resolve({
        browser,
        page,
        release,
      });
    }
  }

  private async getBrowserInstance(): Promise<BrowserInstance | null> {
    if (this.available.length > 0) {
      const browserInstance = this.available.shift();
      if (browserInstance) {
        this.inUse.add(browserInstance);
      }
      return browserInstance || null;
    }

    const totalActive = this.available.length + this.inUse.size;
    if (totalActive >= MAX_BROWSERS) {
      return null;
    }

    try {
      const args = [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-software-rasterizer",
        "--disable-extensions",
      ];

      if (isDocker) {
        args.push("--no-sandbox", "--disable-setuid-sandbox");
      }

      const browser = await chromium.launch({
        headless: true,
        args,
      });

      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      });

      const browserInstance: BrowserInstance = {
        browser,
        context,
        availablePages: [],
        inUsePages: new Set(),
        lastUsed: Date.now(),
        idleTimer: null,
      };

      console.log(
        `[BrowserPool] Created new browser. Total: ${totalActive + 1}/${MAX_BROWSERS}, Docker: ${isDocker}`
      );

      this.inUse.add(browserInstance);
      return browserInstance;
    } catch (error) {
      console.error("[BrowserPool] Error creating browser:", error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log("[BrowserPool] Shutting down pool...");

    this.acquireQueue = [];

    for (const browserInstance of this.available) {
      try {
        if (browserInstance.idleTimer) {
          clearTimeout(browserInstance.idleTimer);
        }
        for (const page of browserInstance.availablePages) {
          try {
            await page.close();
          } catch (error) {
            console.error("[BrowserPool] Error closing page:", error);
          }
        }
        await browserInstance.context.close();
        await browserInstance.browser.close();
      } catch (error) {
        console.error("[BrowserPool] Error closing browser during shutdown:", error);
      }
    }

    for (const browserInstance of this.inUse) {
      try {
        if (browserInstance.idleTimer) {
          clearTimeout(browserInstance.idleTimer);
        }
        for (const page of browserInstance.availablePages) {
          try {
            await page.close();
          } catch (error) {
            console.error("[BrowserPool] Error closing page:", error);
          }
        }
        for (const page of browserInstance.inUsePages) {
          try {
            await page.close();
          } catch (error) {
            console.error("[BrowserPool] Error closing page:", error);
          }
        }
        await browserInstance.context.close();
        await browserInstance.browser.close();
      } catch (error) {
        console.error("[BrowserPool] Error closing browser during shutdown:", error);
      }
    }

    this.available = [];
    this.inUse.clear();

    console.log("[BrowserPool] Pool shut down complete");
  }

  getStats(): BrowserPoolStats {
    return {
      total: this.available.length + this.inUse.size,
      available: this.available.length,
      inUse: this.inUse.size,
    };
  }

  private async getOrCreatePage(
    browserInstance: BrowserInstance
  ): Promise<Page | null> {
    if (browserInstance.availablePages.length > 0) {
      return browserInstance.availablePages.pop() || null;
    }

    if (browserInstance.inUsePages.size >= MAX_PAGES_PER_BROWSER) {
      return null;
    }

    try {
      const page = await browserInstance.context.newPage();
      this.setupPageSecurity(page);
      return page;
    } catch (error) {
      console.error("[BrowserPool] Error creating page:", error);
      return null;
    }
  }

  private setupPageSecurity(page: Page): void {
    page.on("download", (download) => {
      download.cancel();
    });

    page.on("dialog", async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    page.on("popup", (popup) => {
      popup.close().catch(() => {});
    });
  }

  private async cleanPageState(page: Page): Promise<void> {
    try {
      await page.context().clearCookies();
    } catch (error) {
      console.error("[BrowserPool] Error clearing cookies:", error);
    }

    try {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      // Ignore errors on about:blank or restricted pages
    }

    try {
      await page.goto("about:blank", { waitUntil: "domcontentloaded" });
    } catch (error) {
      console.error("[BrowserPool] Error navigating to about:blank:", error);
    }
  }

  private setupProcessCleanup(): void {
    const cleanup = async () => {
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }
}

export function getBrowserPool(): BrowserPool {
  return BrowserPool.getInstance();
}

export type { BrowserPoolStats, AcquiredBrowser };
