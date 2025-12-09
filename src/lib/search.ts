import { chromium } from "playwright";

interface SearchResult {
  url: string;
  title: string;
  description: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchBrave(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    await sleep(3000);

    const results = await page.evaluate(() => {
      const items: Array<{ url: string; title: string; description: string }> = [];

      document.querySelectorAll('[data-type="web"]').forEach((el) => {
        const linkEl = el.querySelector('a[href^="http"]');
        const titleEl = el.querySelector(".title, .snippet-title, h2, h3");
        const descEl = el.querySelector(".snippet-description, .description, p");

        if (linkEl) {
          const url = linkEl.getAttribute("href") || "";
          const title = titleEl?.textContent?.trim() || linkEl.textContent?.trim() || "";
          if (url && title) {
            items.push({
              url,
              title,
              description: descEl?.textContent?.trim() || "",
            });
          }
        }
      });

      return items;
    });

    return results.slice(0, maxResults);
  } finally {
    await browser.close();
  }
}

export async function searchWeb(
  query: string,
  maxResults: number = 5
): Promise<SearchResult[]> {
  try {
    const results = await searchBrave(query, maxResults);
    if (results.length > 0) return results;
    throw new Error("Brave: 0 resultados");
  } catch (e) {
    throw new Error(`Busca falhou: ${(e as Error).message}`);
  }
}
