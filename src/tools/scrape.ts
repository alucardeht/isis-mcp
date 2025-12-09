import * as cheerio from "cheerio";
import { chromium } from "playwright";

interface ScrapeParams {
  url: string;
  selector?: string;
  waitFor?: string;
  javascript: boolean;
}

interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  html?: string;
  selectedElement?: string;
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    ogImage?: string;
  };
  scrapedAt: string;
}

export async function scrapePage(params: ScrapeParams): Promise<ScrapeResult> {
  const { url, selector, waitFor, javascript } = params;

  let html: string;

  if (javascript) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {});
    }

    html = await page.content();
    await browser.close();
  } else {
    const response = await fetch(url);
    html = await response.text();
  }

  const $ = cheerio.load(html);

  $("script, style, noscript, iframe").remove();

  const result: ScrapeResult = {
    url,
    title: $("title").text().trim(),
    content: $("body").text().replace(/\s+/g, " ").trim().slice(0, 10000),
    metadata: {
      description: $('meta[name="description"]').attr("content"),
      keywords: $('meta[name="keywords"]').attr("content"),
      author: $('meta[name="author"]').attr("content"),
      ogImage: $('meta[property="og:image"]').attr("content"),
    },
    scrapedAt: new Date().toISOString(),
  };

  if (selector) {
    const selected = $(selector);
    result.selectedElement = selected.text().trim();
    result.html = selected.html() || undefined;
  }

  return result;
}
