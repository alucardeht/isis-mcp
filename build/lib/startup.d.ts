export interface StartupStatus {
    playwright: boolean;
    searxng: boolean;
    ready: boolean;
}
export declare function runStartupChecksAsync(): void;
export declare function waitForStartup(): Promise<void>;
export declare function isStartupComplete(): boolean;
export declare function getStartupStatus(): StartupStatus | null;
export declare function getStartupStatusAwait(): Promise<StartupStatus>;
export declare function runStartupChecks(): Promise<StartupStatus>;
//# sourceMappingURL=startup.d.ts.map