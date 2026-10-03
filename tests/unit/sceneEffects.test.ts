import { describe, expect, it } from "vitest";
import {
  shouldRenderDepthOfField,
  shouldRenderEffects,
} from "../../src/components/three/SceneEffects";

describe("postprocessing gating", () => {
  it("runs the full chain on a desktop visitor without reduced motion", () => {
    expect(shouldRenderEffects(false, false)).toBe(true);
  });

  it("disables everything under reduced motion, on any tier", () => {
    expect(shouldRenderEffects(true, false)).toBe(false);
    expect(shouldRenderEffects(true, true)).toBe(false);
  });

  it("disables everything on the mobile lite tier, at any motion setting", () => {
    expect(shouldRenderEffects(false, true)).toBe(false);
    expect(shouldRenderEffects(true, true)).toBe(false);
  });

  it("is the only combination that runs the composer", () => {
    const combinations = [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ];
    const enabled = combinations.filter(([reduced, lite]) =>
      shouldRenderEffects(reduced as boolean, lite as boolean),
    );
    expect(enabled).toHaveLength(1);
    expect(enabled[0]).toEqual([false, false]);
  });
});

describe("depth of field gating", () => {
  it("is omitted at the open and the close, where the product is alone", () => {
    expect(shouldRenderDepthOfField("intro")).toBe(false);
    expect(shouldRenderDepthOfField("finale")).toBe(false);
  });

  it("runs through the sections that have foreground and background", () => {
    for (const id of [
      "hero",
      "productReveal",
      "materials",
      "colors",
      "construction",
      "switches",
      "keycaps",
      "performance",
      "configurator",
      "finalProduct",
    ]) {
      expect(shouldRenderDepthOfField(id)).toBe(true);
    }
  });

  it("runs before any section has been resolved", () => {
    expect(shouldRenderDepthOfField(null)).toBe(true);
  });
});