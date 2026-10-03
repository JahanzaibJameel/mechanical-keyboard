import { test, expect } from "@playwright/test";

// Covers the three ways the 3D view can fail. Each asserts the visitor is left
// with the product and an explanation rather than an empty dark field.

const FALLBACK = "[data-webgl-fallback]";

/**
 * Makes getContext("webgl*") return null for every canvas, which is what a
 * browser without WebGL support does. Done as an init script so it is in place
 * before any application code runs.
 */
async function disableWebGL(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patched(
      this: HTMLCanvasElement,
      contextId: string,
      ...rest: unknown[]
    ) {
      if (typeof contextId === "string" && contextId.toLowerCase().includes("webgl")) {
        return null;
      }
      return (original as (...args: unknown[]) => unknown).call(this, contextId, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
}

/** Scrolls far enough to fire first user intent, which is what starts the 3D load. */
async function triggerIntent(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForSelector("section[data-experience-section]", { timeout: 15000 });
  await page.evaluate(() => {
    const el = document.getElementById("materials");
    if (el) window.scrollTo(0, el.offsetTop + 20);
  });
}

test.describe("WebGL fallback", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "requires Chromium");

  test("shows the fallback instead of the canvas when no WebGL context is available", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await disableWebGL(page);
    await page.goto("/");
    await triggerIntent(page);

    const fallback = page.locator(FALLBACK);
    await expect(fallback).toBeVisible({ timeout: 20000 });
    await expect(fallback).toHaveAttribute("data-webgl-fallback", "unsupported");
    await expect(page.locator("canvas")).toHaveCount(0);

    // The image must actually decode, not merely be present in the DOM. The
    // fallback is client-rendered after first intent, so there is no SSR preload
    // for it and the request may still be in flight when the element appears.
    const image = fallback.locator("img");
    await expect(image).toBeVisible();
    await expect
      .poll(async () => image.evaluate((node) => (node as HTMLImageElement).naturalWidth), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);
    const decoded = await image.evaluate((node) => {
      const img = node as HTMLImageElement;
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        alt: img.alt,
        currentSrc: img.currentSrc,
      };
    });
    // next/image serves an optimised variant sized from the `sizes` hint, so the
    // decoded pixel width is a breakpoint value (672 for this hint), not the
    // 1200px source. What matters is that it decoded at all and that the aspect
    // ratio survived, which proves it is the fallback art and not a broken image.
    expect(decoded.width).toBeGreaterThan(0);
    expect(decoded.alt.length).toBeGreaterThan(20);
    expect(decoded.currentSrc).toContain("nor75-fallback");
    const aspect = decoded.width / decoded.height;
    expect(Math.abs(aspect - 1200 / 630)).toBeLessThan(0.02);

    // Product name, tagline and the WebGL note are all present.
    await expect(fallback).toContainText("NØR 75");
    await expect(fallback).toContainText("cannot run the 3D view");
    await expect(fallback).toContainText("WebGL");

    // The page itself is still usable.
    await expect(page.locator("main#experience-content")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  });

  test("swaps to the fallback when the graphics context is lost", async ({ page }) => {
    await page.goto("/");
    await triggerIntent(page);

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 30000 });
    // Let the scene settle so the swap is not confused with the load.
    await page.waitForTimeout(2000);
    await expect(page.locator(FALLBACK)).toHaveCount(0);

    // A real context loss is a driver-level event, so this dispatches the same
    // event the browser would. It exercises the listener and the swap, not the
    // driver's teardown.
    await canvas.evaluate((node) => {
      node.dispatchEvent(
        new Event("webglcontextlost", { cancelable: true, bubbles: false }),
      );
    });

    const fallback = page.locator(FALLBACK);
    await expect(fallback).toBeVisible({ timeout: 15000 });
    await expect(fallback).toHaveAttribute("data-webgl-fallback", "context-lost");
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("renders normally when WebGL is available", async ({ page }) => {
    await page.goto("/");
    await triggerIntent(page);

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);

    // The watchdog must not fire on a healthy scene.
    await expect(page.locator(FALLBACK)).toHaveCount(0);
  });
});