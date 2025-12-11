import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
});
export async function extractContent(html, url) {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (!article)
            return null;
        return {
            title: article.title || "",
            content: article.content || "",
            textContent: article.textContent || "",
            markdown: turndown.turndown(article.content || ""),
            excerpt: article.excerpt || "",
            byline: article.byline || "",
            length: article.length || 0,
        };
    }
    catch (error) {
        console.error("Extraction error:", error);
        return null;
    }
}
//# sourceMappingURL=extractor.js.map