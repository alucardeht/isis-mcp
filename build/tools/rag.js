import { searchWeb } from "../lib/search.js";
import { scrapePage } from "../lib/scraper.js";
import { extractContent } from "../lib/extractor.js";
import { getFromCache, saveToCache, generateContentHandle } from "../lib/cache.js";
import { OllamaSummarizer } from "../lib/summarizer.js";
import { validateUrl, truncateContent, LIMITS } from "../lib/resource-guard.js";
import pLimit from "p-limit";
const scrapeLimiter = pLimit(3);
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
    const pages = await Promise.all(searchResults.map((result) => scrapeLimiter(async () => {
        const urlValidation = validateUrl(result.url);
        if (!urlValidation.valid) {
            console.warn(`[RAG] Skipping invalid URL: ${result.url} - ${urlValidation.error}`);
            return null;
        }
        const cached = await getFromCache(result.url);
        if (cached) {
            const { content: truncatedMarkdown, truncated, originalLength } = truncateContent(cached.markdown, LIMITS.CONTENT_MAX_PER_PAGE);
            return {
                url: result.url,
                title: cached.title,
                markdown: truncatedMarkdown,
                text: cached.content,
                html: cached.content,
                excerpt: "",
                fromCache: true,
                contentTruncated: truncated,
                originalLength: truncated ? originalLength : undefined,
            };
        }
        try {
            const { html } = await scrapePage(result.url, {
                javascript: useJavascript,
                timeout,
            });
            const extracted = await extractContent(html, result.url);
            if (extracted) {
                const { content: truncatedMarkdown, truncated, originalLength } = truncateContent(extracted.markdown, LIMITS.CONTENT_MAX_PER_PAGE);
                await saveToCache(result.url, {
                    content: extracted.textContent,
                    markdown: truncatedMarkdown,
                    title: extracted.title,
                });
                return {
                    url: result.url,
                    title: extracted.title,
                    markdown: truncatedMarkdown,
                    text: extracted.textContent,
                    html: extracted.content,
                    excerpt: extracted.excerpt,
                    fromCache: false,
                    contentTruncated: truncated,
                    originalLength: truncated ? originalLength : undefined,
                };
            }
        }
        catch (e) {
            console.error(`Failed to scrape ${result.url}:`, e);
        }
        return null;
    })));
    const validPages = pages.filter(Boolean);
    const formattedResults = [];
    let totalContentLength = 0;
    for (const p of validPages) {
        if (totalContentLength >= LIMITS.CONTENT_MAX_TOTAL) {
            console.warn(`[RAG] Total content limit reached (${LIMITS.CONTENT_MAX_TOTAL} chars)`);
            break;
        }
        const result = {
            url: p.url,
            title: p.title,
            fromCache: p.fromCache,
            contentTruncated: p.contentTruncated,
        };
        if (p.originalLength !== undefined) {
            result.originalLength = p.originalLength;
        }
        if (contentMode === "preview") {
            result.contentHandle = generateContentHandle(p.url);
        }
        let selectedContent;
        if (outputFormat === "markdown") {
            selectedContent = await applyContentMode(p.markdown, contentMode, summaryModel);
            result.markdown = selectedContent;
        }
        else if (outputFormat === "text") {
            selectedContent = await applyContentMode(p.text, contentMode, summaryModel);
            result.text = selectedContent;
        }
        else if (outputFormat === "html") {
            selectedContent = await applyContentMode(p.html, contentMode, summaryModel);
            result.html = selectedContent;
        }
        if (selectedContent) {
            totalContentLength += selectedContent.length;
        }
        if (p.excerpt && contentMode === "full") {
            result.excerpt = p.excerpt;
        }
        formattedResults.push(result);
    }
    return {
        query,
        results: formattedResults,
        totalResults: validPages.length,
        searchedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=rag.js.map