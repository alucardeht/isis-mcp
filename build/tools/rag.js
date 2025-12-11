import { searchWeb } from "../lib/search.js";
import { scrapePage } from "../lib/scraper.js";
import { extractContent } from "../lib/extractor.js";
import { getFromCache, saveToCache, generateContentHandle } from "../lib/cache.js";
import { OllamaSummarizer } from "../lib/summarizer.js";
function truncateForPreview(content, maxChars = 300) {
    if (!content || content.length <= maxChars)
        return content;
    return content.substring(0, maxChars) + "...";
}
async function applyContentMode(content, mode, summaryModel) {
    if (!content)
        return content;
    if (mode === "preview") {
        return truncateForPreview(content, 300);
    }
    if (mode === "summary") {
        try {
            const summarizer = new OllamaSummarizer({ model: summaryModel });
            const summary = await summarizer.summarize(content);
            if (summary)
                return summary;
            return truncateForPreview(content, 300);
        }
        catch (error) {
            console.warn('Summarization failed, falling back to truncation:', error);
            return truncateForPreview(content, 300);
        }
    }
    return content;
}
export async function rag(params) {
    const { query, maxResults = 5, outputFormat = "markdown", contentMode = "full", summaryModel, useJavascript = false, timeout = 30000, } = params;
    let searchResults;
    try {
        searchResults = await searchWeb(query, maxResults);
    }
    catch (error) {
        return {
            query,
            error: `Busca falhou: ${error.message}. Tente novamente em alguns minutos.`,
            results: [],
            totalResults: 0,
            searchedAt: new Date().toISOString(),
        };
    }
    const pages = await Promise.all(searchResults.map(async (result) => {
        const cached = getFromCache(result.url);
        if (cached) {
            return {
                url: result.url,
                title: cached.title,
                markdown: cached.markdown,
                text: cached.content,
                html: cached.content,
                excerpt: "",
                fromCache: true,
            };
        }
        try {
            const { html } = await scrapePage(result.url, {
                javascript: useJavascript,
                timeout,
            });
            const extracted = await extractContent(html, result.url);
            if (extracted) {
                saveToCache(result.url, {
                    content: extracted.textContent,
                    markdown: extracted.markdown,
                    title: extracted.title,
                });
                return {
                    url: result.url,
                    title: extracted.title,
                    markdown: extracted.markdown,
                    text: extracted.textContent,
                    html: extracted.content,
                    excerpt: extracted.excerpt,
                    fromCache: false,
                };
            }
        }
        catch (e) {
            console.error(`Failed to scrape ${result.url}:`, e);
        }
        return null;
    }));
    const validPages = pages.filter(Boolean);
    const formattedResults = await Promise.all(validPages.map(async (p) => {
        const result = {
            url: p.url,
            title: p.title,
            fromCache: p.fromCache,
        };
        if (contentMode === "preview") {
            result.contentHandle = generateContentHandle(p.url);
        }
        if (outputFormat === "markdown") {
            result.markdown = await applyContentMode(p.markdown, contentMode, summaryModel);
        }
        else if (outputFormat === "text") {
            result.text = await applyContentMode(p.text, contentMode, summaryModel);
        }
        else if (outputFormat === "html") {
            result.html = await applyContentMode(p.html, contentMode, summaryModel);
        }
        if (p.excerpt && contentMode === "full") {
            result.excerpt = p.excerpt;
        }
        return result;
    }));
    return {
        query,
        results: formattedResults,
        totalResults: validPages.length,
        searchedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=rag.js.map