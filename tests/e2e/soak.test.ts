import { test, expect } from "@playwright/test";
import fs from "node:fs";

const RESULTS_DIR = "tests/e2e/results";

function writeSummary(summary: string): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  fs.writeFileSync(`${RESULTS_DIR}/soak-summary.txt`, summary);
}

test.describe("H gate manual items", () => {
  test.setTimeout(90000);

  test("60-second scroll soak - heap stability", async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto("http://localhost:3000/");
    await expect(page.locator("section[data-experience-section]")).toHaveCount(11);

    const getHeap = async () =>
      page.evaluate(() => {
        const m = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
        return m ? { used: m.usedJSHeapSize, total: m.totalJSHeapSize } : { used: 0, total: 0 };
      });

    const heapBefore = await getHeap();

    const start = Date.now();

    while (Date.now() - start < 60000) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
    }

    const heapAfter = await getHeap();

    const delta = heapAfter.used - heapBefore.used;
    const stable = Math.abs(delta) < 3 * 1024 * 1024;

    const sampleCount = 2;

    const summary = [
      `Soak started at ${new Date(start).toISOString()}`,
      `Sample count: ${sampleCount}`,
      `Heap before (used JS): ${Math.round(heapBefore.used / 1024 / 1024 * 100) / 100} MB`,
      `Heap before (total): ${Math.round(heapBefore.total / 1024 / 1024 * 100) / 100} MB`,
      `Heap after (used JS): ${Math.round(heapAfter.used / 1024 / 1024 * 100) / 100} MB`,
      `Heap after (total): ${Math.round(heapAfter.total / 1024 / 1024 * 100) / 100} MB`,
      `Delta (used JS): ${Math.round(delta / 1024 / 1024 * 100) / 100} MB`,
      `Stable within 3 MB: ${stable}`,
      `Console errors: ${consoleErrors.length}`,
      `Console warnings: ${consoleWarnings.length}`,
    ].join("\n");

    console.log(summary);

    writeSummary(summary);

    expect(consoleErrors.length).toBe(0);
    expect(stable).toBe(true);
  });
});
