interface ScreenshotParams {
    url: string;
    fullPage?: boolean;
    width?: number;
    height?: number;
}
interface ScreenshotResult {
    url: string;
    base64: string;
    width: number;
    height: number;
    timestamp: string;
}
export declare function screenshot(params: ScreenshotParams): Promise<ScreenshotResult>;
export {};
//# sourceMappingURL=screenshot.d.ts.map