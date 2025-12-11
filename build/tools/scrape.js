import { scrapePage } from "../lib/scraper.js";
import { extractContent } from "../lib/extractor.js";
import { getFromCache, saveToCache } from "../lib/cache.js";
import { JSDOM } from "jsdom";
export async function scrape(params) {
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
        let selectedContent;
        if (selector) {
            try {
                const dom = new JSDOM(html, { url });
                const element = dom.window.document.querySelector(selector);
                selectedContent = element ? element.textContent || undefined : undefined;
            }
            catch (e) {
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
    }
    catch (error) {
        console.error("Scrape error:", error);
        throw error;
    }
}
//# sourceMappingURL=scrape.js.map