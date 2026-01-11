import { getBrowserPool } from "./browser-pool.js";
export async function scrapePage(url, options = {}) {
    const { javascript = false, timeout = 30000 } = options;
    if (!javascript) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            });
            return {
                html: await response.text(),
                status: response.status,
            };
        }
        catch (error) {
            console.error("Fetch error:", error);
            throw error;
        }
    }
    const { page, release } = await getBrowserPool().acquire();
    try {
        await page.goto(url, { waitUntil: "networkidle", timeout });
        const html = await page.content();
        return { html, status: 200 };
    }
    catch (error) {
        console.error("Browser scraping error:", error);
        throw error;
    }
    finally {
        release();
    }
}
//# sourceMappingURL=scraper.js.map