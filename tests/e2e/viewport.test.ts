import { test, expect } from "@playwright/test";
import fs from "node:fs";

const RESULTS_DIR = "tests/e2e/results";

function writeSummary(summary: string): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  fs.writeFileSync(`${RESULTS_DIR}/viewport-summary.txt`, summary);
}

test.describe("H gate manual items - 375px viewport", () => {
  test.setTimeout(120000);

  test("viewport checks at 375px width", async ({ page, browserName, browser }) => {
    test.skip(browserName !== "chromium", "viewport tests require Chromium");

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:3000/");

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const warningDetails: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === "warning") {
        // Filter out non-application WebGL driver notices (OpenGL ANGLE driver ReadPixels stall
        // warnings from headless Chrome); these appear in every WebGL headless run and are not
        // project code. All other warnings are treated as application-level.
        if (/GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels/.test(msg.text())) {
          return;
        }
        consoleWarnings.push(msg.text());
        warningDetails.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    // Debug helper
    const debugCanvas = async () => {
      const info = await page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>("canvas");
        const rect = canvas?.getBoundingClientRect();
        return {
          hasCanvas: !!canvas,
          canvasRect: rect
            ? {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              }
            : null,
          bodyScrollHeight: document.body.scrollHeight,
          scrollY: window.scrollY,
          documentElementHeight: document.documentElement ? document.documentElement.scrollHeight : 0,
        };
      });
      console.log("canvas debug:", JSON.stringify(info));
      return info;
    };

    // Wait for sections to render first
    await page.waitForSelector("section[data-experience-section]", { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Trigger deferred 3D load: scroll to a later section (activates intent via context + window scroll listener)
    const keycapsSection = page.locator('section[id="keycaps"]');
    await keycapsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await debugCanvas();

    // Also explicitly dispatch scroll/wheel events to guarantee intent fires
    await page.evaluate(() => {
      window.dispatchEvent(new Event("scroll", { bubbles: true }));
      window.dispatchEvent(new Event("wheel", { bubbles: true }));
      window.dispatchEvent(new Event("keydown", { bubbles: true }));
    });
    await page.waitForTimeout(5000);
    await debugCanvas();

    const canvasCount = await page.locator("canvas").count();
    const canvasVisible = canvasCount > 0;

    // Section 08 keycap macro: scroll to the Keycaps section
    const keycapSectionInViewport = await keycapsSection.isVisible();
    const keycapMacroRendered = canvasVisible && keycapSectionInViewport &&
      (await keycapsSection.locator("p.text-lg").innerText()).includes("PBT caps") &&
      (await keycapsSection.locator("ul li").allInnerTexts()).some((t) => ["Ash", "Snow", "Signal"].includes(t.trim()));

    // Section 09 counters fire on scroll-in
    const performanceSection = page.locator('section[id="performance"]');
    await performanceSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    const counterTexts = await performanceSection.locator("p.text-5xl").allTextContents();
    const allText = counterTexts.join(" ");
    const countersFired = /1000|1,000/.test(allText) && /2\.4/.test(allText) && /4000|4,000/.test(allText);

    // reduced-motion path: emulate prefers-reduced-motion and verify final values appear immediately
    //
    // The emulation has to go through emulateMedia. Passing prefersReducedMotion
    // to browser.newContext() is silently ignored: it is not part of
    // BrowserContextOptions, so nothing applies it and matchMedia keeps
    // reporting false. Asserting that the media query is actually live is what
    // stops this check from passing while reduced motion was never in effect,
    // which is what it used to do.
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const reducedMotionPage = await context.newPage();
    await reducedMotionPage.emulateMedia({ reducedMotion: "reduce" });
    await reducedMotionPage.goto("http://localhost:3000/");
    const reducedMotionActive = await reducedMotionPage.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    await reducedMotionPage.waitForSelector("section[data-experience-section]", { timeout: 10000 });
    await reducedMotionPage.waitForTimeout(1000);
    await reducedMotionPage.locator('section[id="performance"]').scrollIntoViewIfNeeded();

    // Read immediately, before the 1500 ms animation could have finished. If
    // reduced motion is live the values are already final; if it is not, they
    // are still 0.0 here.
    const counterTextsRM = await reducedMotionPage.locator("p.text-5xl").allTextContents();
    const allTextRM = counterTextsRM.join(" ");
    const reducedMotionShowsFinal =
      /1000|1,000/.test(allTextRM) && /2\.4/.test(allTextRM) && /4000|4,000/.test(allTextRM);
    await context.close();

    const summary = [
      `Viewport: 375x667`,
      `Browser: ${browserName}`,
      `Canvas visible: ${canvasVisible}`,
      `Section 08 keycap macro renders: ${keycapMacroRendered}`,
      `Section 09 counters fire on scroll-in: ${countersFired}`,
      `prefers-reduced-motion emulation active: ${reducedMotionActive}`,
      `Reduced-motion shows final values immediately: ${reducedMotionShowsFinal}`,
      `Console errors: ${consoleErrors.length}`,
      `Console warnings: ${consoleWarnings.length}`,
      `Warning details: ${warningDetails.join(" | ")}`,
    ].join("\n");

    console.log(summary);

    writeSummary(summary);

    expect(consoleErrors.length).toBe(0);
    expect(consoleWarnings.length).toBe(0);
    expect(keycapMacroRendered).toBe(true);
    expect(countersFired).toBe(true);
    expect(reducedMotionActive).toBe(true);
    expect(reducedMotionShowsFinal).toBe(true);
  });
});
