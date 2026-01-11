import { Browser, Page } from "playwright";
interface BrowserPoolStats {
    total: number;
    available: number;
    inUse: number;
}
interface AcquiredBrowser {
    browser: Browser;
    page: Page;
    release: () => void;
}
declare class BrowserPool {
    private available;
    private inUse;
    private acquireQueue;
    private constructor();
    private static instance;
    static getInstance(): BrowserPool;
    acquire(): Promise<AcquiredBrowser>;
    private processQueue;
    private getBrowserInstance;
    shutdown(): Promise<void>;
    getStats(): BrowserPoolStats;
    private setupProcessCleanup;
}
export declare function getBrowserPool(): BrowserPool;
export type { BrowserPoolStats, AcquiredBrowser };
//# sourceMappingURL=browser-pool.d.ts.map