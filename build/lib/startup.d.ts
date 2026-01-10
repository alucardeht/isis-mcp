export interface StartupStatus {
    playwright: boolean;
    searxng: boolean;
    ready: boolean;
}
export declare function runStartupChecks(): Promise<StartupStatus>;
//# sourceMappingURL=startup.d.ts.map