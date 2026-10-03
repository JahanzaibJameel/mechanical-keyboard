import { MOBILE_LITE_BREAKPOINT } from "@/lib/constants";

/**
 * Render tiers.
 *
 * full  desktop, and anything at or above the breakpoint. Device pixel ratio up
 *       to 2, antialiasing on.
 * lite  viewports below MOBILE_LITE_BREAKPOINT. Device pixel ratio pinned to
 *       MOBILE_LITE_PIXEL_RATIO and antialiasing off, which is the largest
 *       available saving on a phone GPU where the scene is already fill-bound
 *       at 78 meshes.
 *
 * Viewport width is the only signal. hardwareConcurrency and a GPU renderer
 * string would detect low-end hardware more directly, but a wrong positive here
 * costs visual quality on a capable phone, and the fallback path added for
 * unavailable WebGL already covers the genuinely broken case.
 */
export type RenderTier = "full" | "lite";

/**
 * Matches viewports strictly below the breakpoint, so a 768px-wide window is
 * treated as full tier.
 */
export const LITE_TIER_MEDIA_QUERY = `(max-width: ${MOBILE_LITE_BREAKPOINT - 1}px)`;

export function resolveRenderTier(viewportWidth: number): RenderTier {
  return viewportWidth < MOBILE_LITE_BREAKPOINT ? "lite" : "full";
}