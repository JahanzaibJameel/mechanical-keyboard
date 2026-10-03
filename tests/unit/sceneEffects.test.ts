import { describe, expect, it } from "vitest";
import {
  shouldRenderDepthOfField,
  shouldRenderEffects,
} from "../../src/components/three/SceneEffects";
import { isSoftwareRenderer } from "../../src/lib/renderTier";

describe("software renderer detection", () => {
  it("matches the common CPU rasterisers", () => {
    expect(
      isSoftwareRenderer(
        "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
      ),
    ).toBe(true);
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.6, 256 bits)")).toBe(true);
    expect(isSoftwareRenderer("Microsoft Basic Render Driver")).toBe(true);
    expect(isSoftwareRenderer("OpenGL ES 3.0 Software Renderer")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isSoftwareRenderer("SWIFTSHADER")).toBe(true);
    expect(isSoftwareRenderer("Microsoft Basic Render Driver")).toBe(true);
  });

  it("does not match real GPUs", () => {
    expect(
      isSoftwareRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
    ).toBe(false);
    expect(isSoftwareRenderer("Apple M2 Pro")).toBe(false);
    expect(isSoftwareRenderer("AMD Radeon Pro 5500M OpenGL Engine")).toBe(false);
  });

  it("treats an unknown renderer as hardware, so it never silently disables", () => {
    // Failing open matters: a real GPU whose string we do not recognise should
    // keep its effects rather than lose them to a detection miss.
    expect(isSoftwareRenderer(null)).toBe(false);
    expect(isSoftwareRenderer(undefined)).toBe(false);
    expect(isSoftwareRenderer("")).toBe(false);
  });
});

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