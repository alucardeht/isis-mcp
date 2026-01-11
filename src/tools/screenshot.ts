import { getBrowserPool } from '../lib/browser-pool.js';

interface ScreenshotParams {
  url: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
  timeout?: number;
}

interface ScreenshotResult {
  url: string;
  base64: string;
  width: number;
  height: number;
  timestamp: string;
}

export async function screenshot(
  params: ScreenshotParams
): Promise<ScreenshotResult> {
  const {
    url,
    fullPage = false,
    width = 1920,
    height = 1080,
    timeout = 15000,
  } = params;

  const { page, release } = await getBrowserPool().acquire();

  try {
    await page.setViewportSize({ width, height });
    await page.goto(url, { waitUntil: "networkidle", timeout });
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
  } finally {
    release();
  }
}
