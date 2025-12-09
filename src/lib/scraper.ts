import { chromium } from "playwright";

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
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      return {
        html: await response.text(),
        status: response.status,
      };
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    await page.goto(url, { waitUntil: "networkidle", timeout });
    const html = await page.content();

    await page.close();

    return { html, status: 200 };
  } catch (error) {
    console.error("Browser scraping error:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
