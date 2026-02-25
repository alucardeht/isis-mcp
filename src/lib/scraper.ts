import { getBrowserPool } from "./browser-pool.js";

interface ScrapeResult {
  html: string;
  status: number;
}

export async function scrapePage(
  url: string,
  options: { javascript?: boolean; timeout?: number } = {}
): Promise<ScrapeResult> {
  const { javascript = false, timeout = 30000 } = options;

  if (!javascript) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      });
      return {
        html: await response.text(),
        status: response.status,
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error(`Fetch timeout after ${timeout}ms for ${url}`);
      }
      console.error("Fetch error:", error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const { page, release } = await getBrowserPool().acquire();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout });
    const html = await page.content();

    return { html, status: 200 };
  } catch (error) {
    console.error("Browser scraping error:", error);
    throw error;
  } finally {
    release();
  }
}
