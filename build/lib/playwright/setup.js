import { chromium } from "playwright";
import { execSync } from "child_process";
let playwrightReady = false;
export async function ensurePlaywrightReady() {
    if (playwrightReady)
        return true;
    try {
        const browser = await chromium.launch({ headless: true });
        await browser.close();
        playwrightReady = true;
        console.error("[isis-mcp] Playwright: OK");
        return true;
    }
    catch (error) {
        if (error.message?.includes("Executable doesn't exist") ||
            error.message?.includes("browserType.launch")) {
            console.error("[isis-mcp] Playwright browsers not found. Installing automatically...");
            try {
                execSync("npx playwright install chromium --with-deps", {
                    stdio: "inherit",
                    timeout: 120000,
                });
                console.error("[isis-mcp] Playwright: Installed successfully");
                playwrightReady = true;
                return true;
            }
            catch (installError) {
                console.error("[isis-mcp] Playwright: Auto-install failed:", installError.message);
                console.error("[isis-mcp] Run manually: npx playwright install chromium");
                return false;
            }
        }
        console.error("[isis-mcp] Playwright error:", error.message);
        return false;
    }
}
//# sourceMappingURL=setup.js.map