import { search } from "duck-duck-scrape";

interface SearchResult {
  url: string;
  title: string;
  description: string;
}

function isRateLimitError(error: unknown): boolean {
  const message = (error as Error).message?.toLowerCase() || "";
  return message.includes("anomaly") || message.includes("too quickly");
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchWithRetry(
  query: string,
  maxResults: number,
  retries: number = 3
): Promise<SearchResult[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const results = await search(query);
      return results.results.slice(0, maxResults).map((r) => ({
        url: r.url,
        title: r.title,
        description: r.description || "",
      }));
    } catch (error) {
      const rateLimited = isRateLimitError(error);
      const isLastAttempt = attempt === retries - 1;

      if (!rateLimited || isLastAttempt) {
        throw error;
      }

      const backoffMs = Math.pow(2, attempt) * 2000;
      await delay(backoffMs);
    }
  }

  throw new Error("Retry attempts exhausted");
}

async function searchDuckDuckGo(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  return searchWithRetry(query, maxResults);
}

export async function searchWeb(
  query: string,
  maxResults: number = 5
): Promise<SearchResult[]> {
  try {
    const results = await searchDuckDuckGo(query, maxResults);
    if (results.length > 0) return results;
    throw new Error("DuckDuckGo: 0 resultados");
  } catch (e) {
    throw new Error(`Busca falhou: ${(e as Error).message}`);
  }
}
