import { chromium } from "playwright";
export async function screenshot(params) {
    const { url, fullPage = false, width = 1920, height = 1080 } = params;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });
    try {
        await page.setViewportSize({ width, height });
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(1000);
        const screenshotBuffer = await page.screenshot({
            fullPage,
            type: "png",
        });
        const dimensions = await page.evaluate(() => ({
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
        }));
        return {
            url,
            base64: screenshotBuffer.toString("base64"),
            width: fullPage ? dimensions.width : width,
            height: fullPage ? dimensions.height : height,
            timestamp: new Date().toISOString(),
        };
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=screenshot.js.map