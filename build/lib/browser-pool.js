import { chromium } from "playwright";
const MAX_BROWSERS = parseInt(process.env.MAX_BROWSERS ?? "3", 10);
const MAX_IDLE_TIME = parseInt(process.env.MAX_IDLE_TIME ?? "30000", 10);
const ACQUIRE_TIMEOUT = parseInt(process.env.ACQUIRE_TIMEOUT ?? "10000", 10);
class BrowserPool {
    available = [];
    inUse = new Set();
    acquireQueue = [];
    constructor() {
        this.setupProcessCleanup();
    }
    static instance = null;
    static getInstance() {
        if (!BrowserPool.instance) {
            BrowserPool.instance = new BrowserPool();
        }
        return BrowserPool.instance;
    }
    async acquire() {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const index = this.acquireQueue.indexOf(request);
                if (index !== -1) {
                    this.acquireQueue.splice(index, 1);
                }
                reject(new Error(`Browser acquisition timeout after ${ACQUIRE_TIMEOUT}ms`));
            }, ACQUIRE_TIMEOUT);
            const request = {
                resolve: (browser) => {
                    clearTimeout(timeoutId);
                    resolve(browser);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                },
            };
            this.acquireQueue.push(request);
            this.processQueue();
        });
    }
    async processQueue() {
        while (this.acquireQueue.length > 0) {
            const browserInstance = await this.getBrowserInstance();
            if (!browserInstance) {
                break;
            }
            const request = this.acquireQueue.shift();
            if (!request)
                break;
            const { browser, page, idleTimer } = browserInstance;
            if (idleTimer) {
                clearTimeout(idleTimer);
            }
            this.available.splice(this.available.indexOf(browserInstance), 1);
            this.inUse.add(browserInstance);
            const release = () => {
                this.inUse.delete(browserInstance);
                const newIdleTimer = setTimeout(async () => {
                    try {
                        await browser.close();
                        const index = this.available.indexOf(browserInstance);
                        if (index !== -1) {
                            this.available.splice(index, 1);
                        }
                        console.log(`[BrowserPool] Closed idle browser. Available: ${this.available.length}, InUse: ${this.inUse.size}`);
                    }
                    catch (error) {
                        console.error("[BrowserPool] Error closing idle browser:", error);
                    }
                }, MAX_IDLE_TIME);
                browserInstance.lastUsed = Date.now();
                browserInstance.idleTimer = newIdleTimer;
                this.available.push(browserInstance);
                this.processQueue();
            };
            request.resolve({
                browser,
                page,
                release,
            });
        }
    }
    async getBrowserInstance() {
        if (this.available.length > 0) {
            return this.available[0];
        }
        const totalActive = this.available.length + this.inUse.size;
        if (totalActive >= MAX_BROWSERS) {
            return null;
        }
        try {
            const browser = await chromium.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                ],
            });
            const page = await browser.newPage({
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            });
            const browserInstance = {
                browser,
                page,
                lastUsed: Date.now(),
                idleTimer: null,
            };
            console.log(`[BrowserPool] Created new browser. Total: ${totalActive + 1}/${MAX_BROWSERS}`);
            return browserInstance;
        }
        catch (error) {
            console.error("[BrowserPool] Error creating browser:", error);
            throw error;
        }
    }
    async shutdown() {
        console.log("[BrowserPool] Shutting down pool...");
        this.acquireQueue = [];
        for (const browserInstance of this.available) {
            try {
                if (browserInstance.idleTimer) {
                    clearTimeout(browserInstance.idleTimer);
                }
                await browserInstance.page.close();
                await browserInstance.browser.close();
            }
            catch (error) {
                console.error("[BrowserPool] Error closing browser during shutdown:", error);
            }
        }
        for (const browserInstance of this.inUse) {
            try {
                if (browserInstance.idleTimer) {
                    clearTimeout(browserInstance.idleTimer);
                }
                await browserInstance.page.close();
                await browserInstance.browser.close();
            }
            catch (error) {
                console.error("[BrowserPool] Error closing browser during shutdown:", error);
            }
        }
        this.available = [];
        this.inUse.clear();
        console.log("[BrowserPool] Pool shut down complete");
    }
    getStats() {
        return {
            total: this.available.length + this.inUse.size,
            available: this.available.length,
            inUse: this.inUse.size,
        };
    }
    setupProcessCleanup() {
        const cleanup = async () => {
            await this.shutdown();
            process.exit(0);
        };
        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);
    }
}
export function getBrowserPool() {
    return BrowserPool.getInstance();
}
//# sourceMappingURL=browser-pool.js.map