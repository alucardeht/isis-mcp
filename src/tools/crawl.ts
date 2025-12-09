import * as cheerio from "cheerio";

interface CrawlParams {
  startUrl: string;
  maxPages: number;
  sameDomain: boolean;
  extractPattern?: string;
}

interface PageData {
  url: string;
  title: string;
  links: string[];
  extractedData?: string[];
}

interface CrawlResult {
  startUrl: string;
  pagesVisited: number;
  pages: PageData[];
  allLinks: string[];
  crawledAt: string;
}

export async function crawlSite(params: CrawlParams): Promise<CrawlResult> {
  const { startUrl, maxPages, sameDomain, extractPattern } = params;

  const startDomain = new URL(startUrl).hostname;
  const visited = new Set<string>();
  const toVisit = [startUrl];
  const pages: PageData[] = [];
  const allLinks: string[] = [];

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift()!;

    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const html = await response.text();
      const $ = cheerio.load(html);

      const pageLinks: string[] = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, url).href;
          const linkDomain = new URL(absoluteUrl).hostname;

          if (sameDomain && linkDomain !== startDomain) return;
          if (absoluteUrl.startsWith("http")) {
            pageLinks.push(absoluteUrl);
            allLinks.push(absoluteUrl);

            if (!visited.has(absoluteUrl) && !toVisit.includes(absoluteUrl)) {
              toVisit.push(absoluteUrl);
            }
          }
        } catch {}
      });

      const pageData: PageData = {
        url,
        title: $("title").text().trim(),
        links: [...new Set(pageLinks)].slice(0, 20),
      };

      if (extractPattern) {
        const regex = new RegExp(extractPattern, "gi");
        const text = $("body").text();
        const matches = text.match(regex);
        if (matches) {
          pageData.extractedData = [...new Set(matches)];
        }
      }

      pages.push(pageData);
    } catch (error) {
      pages.push({
        url,
        title: "Error",
        links: [],
        extractedData: [`Error: ${error instanceof Error ? error.message : "Unknown"}`],
      });
    }
  }

  return {
    startUrl,
    pagesVisited: pages.length,
    pages,
    allLinks: [...new Set(allLinks)],
    crawledAt: new Date().toISOString(),
  };
}
