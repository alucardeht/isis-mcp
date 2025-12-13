const PUBLIC_SEARXNG_INSTANCES = [
    "https://searx.be",
    "https://search.bus-hit.me",
    "https://searx.tiekoetter.com"
];
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRateLimitError(error) {
    const message = error.message?.toLowerCase() || "";
    return (message.includes("anomaly") ||
        message.includes("too quickly") ||
        message.includes("rate limit") ||
        message.includes("429") ||
        message.includes("service unavailable") ||
        message.includes("503"));
}
async function fetchWithRetry(url, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            if (!response.ok) {
                const statusError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                if (isRateLimitError(statusError)) {
                    throw statusError;
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return response;
        }
        catch (error) {
            const rateLimited = isRateLimitError(error);
            const isLastAttempt = attempt === retries - 1;
            if (!rateLimited || isLastAttempt) {
                throw error;
            }
            const backoffMs = Math.pow(2, attempt) * 2000;
            await delay(backoffMs);
        }
    }
    throw new Error("Fetch attempts exhausted");
}
async function searchSearxngLocal(query, maxResults) {
    const encodedQuery = encodeURIComponent(query);
    const url = `http://localhost:8080/search?q=${encodedQuery}&format=json&number_of_results=${maxResults}`;
    const response = await fetchWithRetry(url);
    const data = (await response.json());
    if (!data.results || data.results.length === 0) {
        throw new Error("No results from SearXNG local");
    }
    return data.results.slice(0, maxResults).map((r) => ({
        url: r.url,
        title: r.title,
        description: r.content || ""
    }));
}
async function searchScraperAPI(query, maxResults) {
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) {
        throw new Error("SCRAPER_API_KEY not configured");
    }
    const duckUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(duckUrl)}`;
    const response = await fetchWithRetry(scraperUrl);
    const html = await response.text();
    const results = [];
    const resultRegex = /<a\s+class="result__a"\s+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a\s+class="result__snippet"[^>]*>([^<]*)<\/a>/g;
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
        const [, url, title, description] = match;
        if (url && title) {
            results.push({
                url: url.trim(),
                title: title.trim(),
                description: (description || "").trim()
            });
        }
    }
    if (results.length === 0) {
        throw new Error("No results parsed from DuckDuckGo HTML");
    }
    return results.slice(0, maxResults);
}
async function searchSearxngPublic(instance, query, maxResults) {
    const encodedQuery = encodeURIComponent(query);
    const url = `${instance}/search?q=${encodedQuery}&format=json&number_of_results=${maxResults}`;
    const response = await fetchWithRetry(url);
    const data = (await response.json());
    if (!data.results || data.results.length === 0) {
        throw new Error(`No results from SearXNG ${instance}`);
    }
    return data.results.slice(0, maxResults).map((r) => ({
        url: r.url,
        title: r.title,
        description: r.content || ""
    }));
}
export async function searchWeb(query, maxResults = 5) {
    try {
        return await searchSearxngLocal(query, maxResults);
    }
    catch (e) {
        console.warn("SearXNG local failed:", e.message);
    }
    if (process.env.SCRAPER_API_KEY) {
        try {
            return await searchScraperAPI(query, maxResults);
        }
        catch (e) {
            console.warn("ScraperAPI failed:", e.message);
        }
    }
    for (const instance of PUBLIC_SEARXNG_INSTANCES) {
        try {
            return await searchSearxngPublic(instance, query, maxResults);
        }
        catch (e) {
            console.warn(`SearXNG ${instance} failed:`, e.message);
        }
    }
    throw new Error("All search providers failed");
}
//# sourceMappingURL=search.js.map