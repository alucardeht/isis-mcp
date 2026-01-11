import { search as duckDuckGoSearch, SafeSearchType } from "duck-duck-scrape";
import { ensureSearxngRunning } from "./docker-searxng.js";
let dockerInitialized = false;
let dockerAvailable = false;
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 2;
const PROVIDERS = [
    { name: "duck-duck-scrape", timeout: DEFAULT_TIMEOUT, retries: 2 },
    { name: "searxng-local", timeout: 8000, retries: 1 },
    { name: "scraper-api", timeout: 15000, retries: 1 },
    { name: "searxng-public", timeout: 12000, retries: 1 }
];
const PUBLIC_SEARXNG_INSTANCES = [
    "https://searx.work",
    "https://search.sapti.me",
    "https://paulgo.io",
    "https://searx.info",
    "https://searx.be",
    "https://search.bus-hit.me",
    "https://searx.tiekoetter.com"
];
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function log(provider, message) {
    console.log(`[Search] [${provider}] ${message}`);
}
function logError(provider, error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Search] [${provider}] Failed: ${errorMsg}`);
}
function isRateLimitError(error) {
    const message = error.message?.toLowerCase() || "";
    return (message.includes("anomaly") ||
        message.includes("too quickly") ||
        message.includes("rate limit") ||
        message.includes("429") ||
        message.includes("service unavailable") ||
        message.includes("503") ||
        message.includes("cloudflare") ||
        message.includes("429"));
}
function createAbortController(timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timeoutId };
}
async function fetchWithRetry(url, provider, retries = 3, timeoutMs = DEFAULT_TIMEOUT, customHeaders) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const { controller, timeoutId } = createAbortController(timeoutMs);
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    ...customHeaders
                }
            });
            clearTimeout(timeoutId);
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
            const isTimeout = error instanceof Error && error.name === "AbortError";
            if (isTimeout) {
                logError(provider, `Timeout (${timeoutMs}ms)`);
            }
            if (!rateLimited || isLastAttempt) {
                throw error;
            }
            const backoffMs = Math.pow(2, attempt) * 1000;
            log(provider, `Rate limited, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${retries})`);
            await delay(backoffMs);
        }
    }
    throw new Error("Fetch attempts exhausted");
}
async function searchDuckDuckGo(query, maxResults) {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 2000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const userAgent = getRandomUserAgent();
        log("duck-duck-scrape", `Attempt ${attempt}/${MAX_RETRIES} - Searching for: "${query}"`);
        try {
            if (attempt > 1) {
                const delayMs = BASE_DELAY * Math.pow(2, attempt - 2);
                log("duck-duck-scrape", `Waiting ${delayMs}ms before retry...`);
                await delay(delayMs);
            }
            const searchResults = await duckDuckGoSearch(query, {
                safeSearch: SafeSearchType.OFF
            });
            if (!searchResults.results || searchResults.results.length === 0) {
                throw new Error("No results returned");
            }
            const formatted = searchResults.results.slice(0, maxResults).map((r) => ({
                url: r.link || r.url || "",
                title: r.title || "",
                description: r.snippet || r.description || ""
            }));
            log("duck-duck-scrape", `Success - found ${formatted.length} results`);
            return formatted;
        }
        catch (error) {
            const errorMsg = error.message || "";
            const isRateLimit = errorMsg.includes("anomaly") ||
                errorMsg.includes("too quickly") ||
                errorMsg.includes("rate limit");
            if (isRateLimit && attempt < MAX_RETRIES) {
                log("duck-duck-scrape", `Rate limited, will retry...`);
                continue;
            }
            if (attempt === MAX_RETRIES) {
                logError("duck-duck-scrape", error);
                throw error;
            }
        }
    }
    throw new Error("All DuckDuckGo attempts failed");
}
async function searchSearxngLocal(query, maxResults) {
    if (!dockerInitialized) {
        dockerInitialized = true;
        log("searxng-local", "Attempting to auto-start Docker SearXNG...");
        dockerAvailable = await ensureSearxngRunning();
        if (dockerAvailable) {
            log("searxng-local", "Docker SearXNG is ready");
        }
        else {
            log("searxng-local", "Docker SearXNG not available, will try anyway...");
        }
    }
    log("searxng-local", `Searching for: "${query}"`);
    const encodedQuery = encodeURIComponent(query);
    const url = `http://localhost:8080/search?q=${encodedQuery}&format=json&number_of_results=${maxResults}`;
    const searxngHeaders = {
        "X-Forwarded-For": "127.0.0.1",
        "X-Real-IP": "127.0.0.1"
    };
    try {
        const response = await fetchWithRetry(url, "searxng-local", 1, 8000, searxngHeaders);
        const data = (await response.json());
        if (!data.results || data.results.length === 0) {
            throw new Error("No results returned");
        }
        const formatted = data.results.slice(0, maxResults).map((r) => ({
            url: r.url,
            title: r.title,
            description: r.content || ""
        }));
        log("searxng-local", `Success - found ${formatted.length} results`);
        return formatted;
    }
    catch (error) {
        logError("searxng-local", error);
        throw error;
    }
}
async function searchScraperAPI(query, maxResults) {
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) {
        throw new Error("SCRAPER_API_KEY not configured");
    }
    log("scraper-api", `Searching for: "${query}"`);
    const duckUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(duckUrl)}`;
    try {
        const response = await fetchWithRetry(scraperUrl, "scraper-api", 1, 15000);
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
            throw new Error("No results parsed from HTML");
        }
        log("scraper-api", `Success - found ${results.length} results`);
        return results.slice(0, maxResults);
    }
    catch (error) {
        logError("scraper-api", error);
        throw error;
    }
}
async function searchSearxngPublic(instance, query, maxResults) {
    log("searxng-public", `Trying ${instance}...`);
    const encodedQuery = encodeURIComponent(query);
    const url = `${instance}/search?q=${encodedQuery}&format=json&number_of_results=${maxResults}`;
    const searxngHeaders = {
        "X-Forwarded-For": "127.0.0.1",
        "X-Real-IP": "127.0.0.1"
    };
    try {
        const response = await fetchWithRetry(url, `searxng-public(${instance})`, 1, 12000, searxngHeaders);
        const data = (await response.json());
        if (!data.results || data.results.length === 0) {
            throw new Error("No results returned");
        }
        const formatted = data.results.slice(0, maxResults).map((r) => ({
            url: r.url,
            title: r.title,
            description: r.content || ""
        }));
        log("searxng-public", `Success with ${instance} - found ${formatted.length} results`);
        return formatted;
    }
    catch (error) {
        logError(`searxng-public(${instance})`, error);
        throw error;
    }
}
async function raceForFirstResult(providers) {
    return new Promise((resolve) => {
        let resolved = false;
        const results = new Map();
        let completedCount = 0;
        providers.forEach(({ name, promise }) => {
            promise
                .then((result) => {
                results.set(name, result);
                if (!resolved && result.length > 0) {
                    resolved = true;
                    log("orchestrator", `First result from: ${name} (${result.length} results)`);
                    resolve(result);
                }
            })
                .catch((error) => {
                const errorMsg = error instanceof Error ? error.message : String(error);
                log("orchestrator", `Provider ${name} failed: ${errorMsg}`);
            })
                .finally(() => {
                completedCount++;
                if (completedCount === providers.length && !resolved) {
                    for (const [providerName, providerResults] of results) {
                        if (providerResults.length > 0) {
                            resolved = true;
                            log("orchestrator", `Using results from: ${providerName} (${providerResults.length} results)`);
                            resolve(providerResults);
                            return;
                        }
                    }
                    resolve(null);
                }
            });
        });
    });
}
export async function searchWeb(query, maxResults = 5) {
    log("orchestrator", "Starting parallel search race...");
    const providers = [];
    providers.push({
        name: "duck-duck-scrape",
        promise: searchDuckDuckGo(query, maxResults).catch((err) => {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logError("duck-duck-scrape", errorMsg);
            return [];
        })
    });
    providers.push({
        name: "searxng-local",
        promise: searchSearxngLocal(query, maxResults).catch((err) => {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logError("searxng-local", errorMsg);
            return [];
        })
    });
    if (process.env.SCRAPER_API_KEY) {
        providers.push({
            name: "scraper-api",
            promise: searchScraperAPI(query, maxResults).catch((err) => {
                const errorMsg = err instanceof Error ? err.message : String(err);
                logError("scraper-api", errorMsg);
                return [];
            })
        });
    }
    providers.push({
        name: "searxng-public",
        promise: (async () => {
            for (const instance of PUBLIC_SEARXNG_INSTANCES) {
                try {
                    return await searchSearxngPublic(instance, query, maxResults);
                }
                catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    log("searxng-public", `Instance ${instance} failed: ${errorMsg}`);
                }
            }
            return [];
        })()
    });
    const raceTimeout = new Promise((resolve) => {
        setTimeout(() => {
            log("orchestrator", "Race timeout reached (10s)");
            resolve([]);
        }, 10000);
    });
    const firstResult = await Promise.race([
        raceForFirstResult(providers),
        raceTimeout
    ]);
    if (firstResult && firstResult.length > 0) {
        return firstResult;
    }
    const allResults = await Promise.all(providers.map((p) => p.promise));
    for (const result of allResults) {
        if (result.length > 0) {
            log("orchestrator", "Using fallback result after race timeout");
            return result;
        }
    }
    throw new Error("All search providers failed");
}
//# sourceMappingURL=search.js.map