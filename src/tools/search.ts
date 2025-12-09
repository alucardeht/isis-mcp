import * as cheerio from "cheerio";

interface SearchParams {
  query: string;
  maxResults: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  searchedAt: string;
}

export async function searchGoogle(params: SearchParams): Promise<SearchResponse> {
  const { query, maxResults } = params;

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}`;

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const results: SearchResult[] = [];

  $("div.g").each((_, el) => {
    const titleEl = $(el).find("h3").first();
    const linkEl = $(el).find("a").first();
    const snippetEl = $(el).find("div[data-sncf]").first();

    const title = titleEl.text().trim();
    const url = linkEl.attr("href") || "";
    const snippet = snippetEl.text().trim() || $(el).find("span").text().trim();

    if (title && url && url.startsWith("http")) {
      results.push({ title, url, snippet: snippet.slice(0, 200) });
    }
  });

  return {
    query,
    results: results.slice(0, maxResults),
    searchedAt: new Date().toISOString(),
  };
}
