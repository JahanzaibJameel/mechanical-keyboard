import { sections } from "@/data/sections";

export type SectionRevealState = "hidden" | "visible";

/**
 * Defines the exploded-offset positions for each construction part.
 * Offsets are relative to the assembled state (y-axis only).
 *
 * Order (top → bottom): KEYCAPS → SWITCHES → PLATE → PCB → CASE
 */
export const EXPLODED_OFFSETS: Record<string, number> = {
  keycap: 0.75,
  switch: 0.35,
  plate: 0.05,
  pcb: -0.15,
  case: -0.35,
};

/**
 * Maps a part identifier to its exploded offset.
 */
export function getExplodedOffset(partId: string): number {
  return EXPLODED_OFFSETS[partId] ?? 0;
}

/**
 * Resolves how far through its own timeline a section is, given the global
 * page progress (0→1).
 *
 * The section's local progress runs 0→1 across the section's timeline slice,
 * so the global progress has to have the slice start subtracted and be divided
 * by the slice width. Multiplying by the width instead would cap every section
 * at `width` — for the construction slice (0.14 wide) the explosion would never
 * exceed 14% of its travel and would be invisible.
 */
export function getSectionLocalProgress(
  progress: number,
  section: { id: string; timelineStart: number; timelineEnd: number }
): number {
  const range = section.timelineEnd - section.timelineStart;
  if (range <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, (progress - section.timelineStart) / range));
}
