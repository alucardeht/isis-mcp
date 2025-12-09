import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

interface ExtractedContent {
  title: string;
  content: string;
  textContent: string;
  markdown: string;
  excerpt: string;
  byline: string;
  length: number;
}

export async function extractContent(
  html: string,
  url: string
): Promise<ExtractedContent | null> {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) return null;

    return {
      title: article.title || "",
      content: article.content || "",
      textContent: article.textContent || "",
      markdown: turndown.turndown(article.content || ""),
      excerpt: article.excerpt || "",
      byline: article.byline || "",
      length: article.length || 0,
    };
  } catch (error) {
    console.error("Extraction error:", error);
    return null;
  }
}
