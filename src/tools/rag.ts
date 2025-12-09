import { searchWeb } from "../lib/search.js";
import { scrapePage } from "../lib/scraper.js";
import { extractContent } from "../lib/extractor.js";
import { getFromCache, saveToCache } from "../lib/cache.js";

interface RagParams {
  query: string;
  maxResults?: number;
  outputFormat?: "markdown" | "text" | "html";
  useJavascript?: boolean;
  timeout?: number;
}

interface PageResult {
  url: string;
  title: string;
  markdown?: string;
  text?: string;
  html?: string;
  excerpt?: string;
  fromCache: boolean;
}

interface RagResult {
  query: string;
  results: PageResult[];
  totalResults: number;
  searchedAt: string;
  error?: string;
}

export async function rag(params: RagParams): Promise<RagResult> {
  const {
    query,
    maxResults = 5,
    outputFormat = "markdown",
    useJavascript = false,
    timeout = 30000,
  } = params;

  let searchResults: Array<{
    url: string;
    title: string;
    description: string;
  }>;

  try {
    searchResults = await searchWeb(query, maxResults);
  } catch (error) {
    return {
      query,
      error: `Busca falhou: ${(error as Error).message}. Tente novamente em alguns minutos.`,
      results: [],
      totalResults: 0,
      searchedAt: new Date().toISOString(),
    };
  }

  const pages = await Promise.all(
    searchResults.map(async (result) => {
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
      } catch (e) {
        console.error(`Failed to scrape ${result.url}:`, e);
      }
      return null;
    })
  );

  const validPages = pages.filter(Boolean) as PageResult[];

  const formattedResults = validPages.map((p) => {
    const result: any = {
      url: p.url,
      title: p.title,
      fromCache: p.fromCache,
    };

    if (outputFormat === "markdown") {
      result.markdown = p.markdown;
    } else if (outputFormat === "text") {
      result.text = p.text;
    } else if (outputFormat === "html") {
      result.html = p.html;
    }

    if (p.excerpt) {
      result.excerpt = p.excerpt;
    }

    return result;
  });

  return {
    query,
    results: formattedResults,
    totalResults: validPages.length,
    searchedAt: new Date().toISOString(),
  };
}
