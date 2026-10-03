import { test, expect } from "@playwright/test";

// Reduced-motion coverage for all twelve sections.
//
// The Definition of Done asks for the reduced-motion path to be verified on every
// section, and the audit found it verified for section 09 only. This walks each
// section in a real prefers-reduced-motion context and checks three things per
// section: the canvas is alive, anything that animates has landed on its final
// value rather than being caught mid-tween, and nothing logged a console error.
//
// The emulation has to go through emulateMedia. Passing prefersReducedMotion to
// browser.newContext is silently ignored: it is not part of BrowserContextOptions,
// so nothing applies it and matchMedia keeps reporting false. Every test asserts
// the media query is live before trusting a result from it, which is what stops
// these checks passing while reduced motion was never in effect.

type SectionCase = {
  readonly id: string;
  readonly number: string;
  /** Sections with a JS reduced-motion path today. */
  readonly dedicated: boolean;
  /**
   * Element that carries the section's visible content. It defaults to the
   * scroll section, but the hero is not one of those: `section#hero` is an empty
   * anchor marked `data-progress-boundary`, and the hero copy is rendered inside
   * the fixed canvas layer. SiteShell's reveal pass therefore styles a different
   * element for the hero than for the other eleven.
   */
  readonly activeSelector?: string;
  /** Final-value assertion for sections that animate something. */
  readonly finalState?: (page: import("@playwright/test").Page) => Promise<void>;
};

const SECTIONS: readonly SectionCase[] = [
  { id: "intro", number: "01", dedicated: false },
  {
    id: "hero",
    number: "02",
    dedicated: true,
    activeSelector: '[aria-label="NØR 75 hero"]',
    // The hero headline is un-clipped by the timeline; with motion suppressed the
    // characters must already be fully visible.
    finalState: async (page) => {
      const clips = await page
        .locator("[data-reveal-character]")
        .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).clipPath));

      expect(clips.length).toBeGreaterThan(0);
      // SplitText's hidden state is inset(100% 0 0 0) and the reduced-motion
      // branch sets inset(0). Anything still reporting a 100% inset means the
      // characters are clipped, which is the regression worth catching.
      for (const clip of clips) {
        expect(clip === "none" || clip === "" || !clip.includes("100%")).toBe(true);
      }
    },
  },
  { id: "productReveal", number: "03", dedicated: false },
  { id: "materials", number: "04", dedicated: false },
  { id: "colors", number: "05", dedicated: false },
  { id: "construction", number: "06", dedicated: false },
  {
    id: "switches",
    number: "07",
    dedicated: true,
    // The explosion is held at full separation through this section and the switch
    // press is a snap, so the canvas must be drawing.
    finalState: async (page) => {
      await expect(page.locator("canvas")).toBeVisible();
    },
  },
  { id: "keycaps", number: "08", dedicated: false },
  {
    id: "performance",
    number: "09",
    dedicated: true,
    // Counters read their value straight from target, so they must be final
    // immediately on scroll-in rather than counting up over 1500ms.
    finalState: async (page) => {
      const texts = await page.locator("p.text-5xl").allTextContents();
      const all = texts.join(" ");
      expect(/1000|1,000/.test(all)).toBe(true);
      expect(/2\.4/.test(all)).toBe(true);
      expect(/4000|4,000/.test(all)).toBe(true);
    },
  },
  { id: "configurator", number: "10", dedicated: true },
  { id: "finalProduct", number: "11", dedicated: false },
  { id: "finale", number: "12", dedicated: false },
];

test.describe("reduced motion across all sections", () => {
  test.setTimeout(180000);

  for (const section of SECTIONS) {
    test(`section ${section.number} ${section.id} renders settled with motion suppressed`, async ({
      browser,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "requires Chromium");

      const consoleErrors: string[] = [];

      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");

      // Guard: without this the rest of the test proves nothing.
      const motionActive = await page.evaluate(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      expect(motionActive).toBe(true);

      await page.waitForSelector("section[data-experience-section]", { timeout: 20000 });

      // Fire intent so the deferred 3D chunk loads.
      await page.evaluate(() => window.dispatchEvent(new Event("wheel", { bubbles: true })));
      await page.waitForSelector("canvas", { timeout: 30000 });

      // Move to the section under test and let the frame loop settle.
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo(0, el.offsetTop + 20);
      }, section.id);
      // Section-specific final state runs BEFORE the long settle, because the point of
      // these checks is immediacy. The Performance counters animate over 1500ms
      // with motion allowed, so reading them at 400ms only yields the final values
      // if reduced motion actually suppressed the animation. Reading them after a
      // 2500ms settle would pass either way and prove nothing.
      await page.waitForTimeout(400);
      if (section.finalState) {
        await section.finalState(page);
      }

      // Now let the frame loop settle before checking paint state.
      await page.waitForTimeout(2500);

      const target = page.locator(section.activeSelector ?? `section#${section.id}`);

      // (a) the section rendered and is the active one
      await expect(target).toBeVisible();
      await expect(target).toHaveClass(/opacity-100/);

      // The hero also carries aria-hidden once another section is active.
      if (section.id === "hero") {
        await expect(target).toHaveAttribute("aria-hidden", "false");
      }

      // (b) the canvas is present and rendering
      await expect(page.locator("canvas")).toBeVisible();
      const painted = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return { width: 0, height: 0 };
        const rect = canvas.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      });
      expect(painted.width).toBeGreaterThan(0);
      expect(painted.height).toBeGreaterThan(0);

      // (c) nothing from project code errored
      expect(consoleErrors).toEqual([]);

      await context.close();
    });
  }

  test("the full walk covers twelve sections", () => {
    expect(SECTIONS).toHaveLength(12);
    expect(SECTIONS.filter((s) => s.dedicated).map((s) => s.id)).toEqual([
      "hero",
      "switches",
      "performance",
      "configurator",
    ]);
  });
});