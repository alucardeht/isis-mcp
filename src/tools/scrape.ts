import { scrapePage } from "../lib/scraper.js";
import { extractContent } from "../lib/extractor.js";
import { getFromCache, saveToCache } from "../lib/cache.js";
import { JSDOM } from "jsdom";

interface ScrapeParams {
  url: string;
  selector?: string;
  javascript?: boolean;
  timeout?: number;
}

interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  markdown: string;
  selectedContent?: string;
  fromCache: boolean;
  timestamp: string;
}

export async function scrape(params: ScrapeParams): Promise<ScrapeResult> {
  const { url, selector, javascript = false, timeout = 30000 } = params;

  const cached = getFromCache(url);
  if (cached && !selector) {
    return {
      url,
      title: cached.title,
      content: cached.content,
      markdown: cached.markdown,
      fromCache: true,
      timestamp: new Date(cached.cached_at).toISOString(),
    };
  }

  try {
    const { html } = await scrapePage(url, { javascript, timeout });
    const extracted = await extractContent(html, url);

    if (!extracted) {
      throw new Error("Failed to extract content");
    }

    if (!cached) {
      saveToCache(url, {
        content: extracted.textContent,
        markdown: extracted.markdown,
        title: extracted.title,
      });
    }

    let selectedContent: string | undefined;
    if (selector) {
      try {
        const dom = new JSDOM(html, { url });
        const element = dom.window.document.querySelector(selector);
        selectedContent = element ? element.textContent || undefined : undefined;
      } catch (e) {
        console.error("Selector error:", e);
      }
    }

    return {
      url,
      title: extracted.title,
      content: extracted.textContent,
      markdown: extracted.markdown,
      selectedContent,
      fromCache: false,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Scrape error:", error);
    throw error;
  }
}
