import { scrapePage } from "../lib/scraper.js";
import { extractContent } from "../lib/extractor.js";
import { getFromCache, saveToCache } from "../lib/cache.js";
import { validateUrl, truncateContent, LIMITS } from "../lib/resource-guard.js";
import { JSDOM } from "jsdom";
export async function scrape(params) {
    const { url, selector, useJavascript = false, timeout = 30000, includeRawContent = false } = params;
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
        return {
            url,
            title: '',
            markdown: '',
            fromCache: false,
            timestamp: new Date().toISOString(),
            error: `Invalid URL: ${urlValidation.error}`,
        };
    }
    const cached = await getFromCache(url);
    if (cached && !selector) {
        const { content: truncatedMarkdown, truncated, originalLength } = truncateContent(cached.markdown, LIMITS.CONTENT_MAX_PER_PAGE);
        return {
            url,
            title: cached.title,
            markdown: truncatedMarkdown,
            content: includeRawContent ? cached.content : undefined,
            fromCache: true,
            timestamp: new Date(cached.cached_at).toISOString(),
            contentTruncated: truncated,
            originalLength: truncated ? originalLength : undefined,
        };
    }
    try {
        const { html } = await scrapePage(url, { javascript: useJavascript, timeout });
        const extracted = await extractContent(html, url);
        if (!extracted) {
            return {
                url,
                title: '',
                markdown: '',
                fromCache: false,
                timestamp: new Date().toISOString(),
                error: 'Failed to extract content',
            };
        }
        if (!cached) {
            await saveToCache(url, {
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
        const { content: truncatedMarkdown, truncated, originalLength } = truncateContent(extracted.markdown, LIMITS.CONTENT_MAX_PER_PAGE);
        return {
            url,
            title: extracted.title,
            markdown: truncatedMarkdown,
            content: includeRawContent ? extracted.textContent : undefined,
            selectedContent,
            fromCache: false,
            timestamp: new Date().toISOString(),
            contentTruncated: truncated,
            originalLength: truncated ? originalLength : undefined,
        };
    }
    catch (error) {
        return {
            url,
            title: '',
            markdown: '',
            fromCache: false,
            timestamp: new Date().toISOString(),
            error: `Scrape failed: ${error.message}`,
        };
    }
}
//# sourceMappingURL=scrape.js.map