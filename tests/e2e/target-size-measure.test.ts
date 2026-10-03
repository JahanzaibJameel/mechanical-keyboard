import { test, expect } from "@playwright/test";

test.describe("target-size measurement", () => {
  test("measure computed button sizes", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("section[data-experience-section]");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.9));
    await page.waitForTimeout(1500);

    const buttons = await page.locator('fieldset.border-0 button').all();
    const results = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('fieldset.border-0 button'));
      return buttons.slice(0, 15).map((b) => {
        const s = window.getComputedStyle(b);
        const box = b.getBoundingClientRect();
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          minHeight: s.minHeight,
          padding: s.paddingTop + " " + s.paddingBottom,
          text: b.textContent?.slice(0, 12),
        };
      });
    });
    console.log("computed buttons:", JSON.stringify(results, null, 2));
    expect(buttons.length).toBeGreaterThan(0);
  });
});
