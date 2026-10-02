export {
  EXPLODED_OFFSETS,
  getExplodedOffset,
  getSectionLocalProgress,
} from "@/animation/timelines/constructionTimeline";

export type SectionRevealState = "hidden" | "visible";

/**
 * Resolves the reveal state for a section given the currently active section.
 * Only the active section is revealed; every other section stays hidden until
 * it becomes active.
 */
export function sectionRevealState(
  sectionId: string,
  activeSectionId: string | null,
): SectionRevealState {
  return sectionId === activeSectionId ? "visible" : "hidden";
}
