import { describe, expect, it } from "vitest";
import {
  LITE_TIER_MEDIA_QUERY,
  resolveRenderTier,
} from "../../src/lib/renderTier";
import { MOBILE_LITE_BREAKPOINT } from "../../src/lib/constants";

describe("render tier", () => {
  it("treats viewports below the breakpoint as lite", () => {
    expect(resolveRenderTier(320)).toBe("lite");
    expect(resolveRenderTier(375)).toBe("lite");
    expect(resolveRenderTier(414)).toBe("lite");
  });

  // The media query uses max-width: breakpoint - 1, so a viewport exactly on the
  // breakpoint is full tier. An off-by-one here would silently downgrade every
  // 768px tablet.
  it("treats a viewport exactly on the breakpoint as full", () => {
    expect(resolveRenderTier(MOBILE_LITE_BREAKPOINT)).toBe("full");
    expect(resolveRenderTier(MOBILE_LITE_BREAKPOINT - 1)).toBe("lite");
    expect(resolveRenderTier(MOBILE_LITE_BREAKPOINT + 1)).toBe("full");
  });

  it("treats desktop widths as full", () => {
    expect(resolveRenderTier(1024)).toBe("full");
    expect(resolveRenderTier(1920)).toBe("full");
  });

  it("keeps the media query consistent with the resolver", () => {
    expect(LITE_TIER_MEDIA_QUERY).toBe(`(max-width: ${MOBILE_LITE_BREAKPOINT - 1}px)`);
  });
});