import { chromium } from 'playwright';

(async () => {
    try {
        console.log("Launching Chromium...");
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage({ viewport: { width: 1280, height: 1080 } });
        console.log("Navigating to http://localhost:3001 ...");
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000); // Wait for animations to finish
        console.log("Taking screenshot...");
        await page.screenshot({ path: '/Users/savantrock/Workspace/scriptsxo/scripts/screenshot.png', fullPage: true });
        await browser.close();
        console.log("Screenshot saved at scripts/screenshot.png");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
})();
