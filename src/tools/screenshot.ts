import { chromium } from "playwright";

interface ScreenshotParams {
  url: string;
  fullPage: boolean;
  width: number;
  height: number;
}

interface ScreenshotResult {
  url: string;
  base64: string;
  width: number;
  height: number;
  capturedAt: string;
}

export async function takeScreenshot(params: ScreenshotParams): Promise<ScreenshotResult> {
  const { url, fullPage, width, height } = params;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const screenshot = await page.screenshot({
    fullPage,
    type: "png",
  });

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));

  await browser.close();

  return {
    url,
    base64: screenshot.toString("base64"),
    width: fullPage ? dimensions.width : width,
    height: fullPage ? dimensions.height : height,
    capturedAt: new Date().toISOString(),
  };
}
