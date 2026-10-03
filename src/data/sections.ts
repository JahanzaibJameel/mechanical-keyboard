import type { CameraStateId } from "@/types/scene";

export type SectionId =
  | "intro"
  | "hero"
  | "productReveal"
  | "materials"
  | "colors"
  | "construction"
  | "switches"
  | "keycaps"
  | "performance"
  | "configurator"
  | "finalProduct"
  | "finale";

export type Section = {
  readonly id: string;
  readonly label: string;
  readonly timelineStart: number;
  readonly timelineEnd: number;
  readonly cameraState: CameraStateId;
};

/** Mutable mirror of a section's timeline window. */
type SectionTableEntry = {
  id: string;
  label: string;
  timelineStart: number;
  timelineEnd: number;
  cameraState: CameraStateId;
};

export type SectionRange = {
  readonly id: string;
  readonly start: number;
  readonly end: number;
};

export type MeasuredSectionBox = {
  readonly id: string;
  readonly top: number;
  readonly height: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Converts measured DOM geometry into normalized timeline windows.
 *
 * Page progress is `scrollY / (scrollHeight - innerHeight)`, so a section that
 * occupies document pixels [top, top + height] is on screen between those two
 * values divided by the scroll range. Deriving the windows this way keeps the
 * camera schedule and the section animations locked to the real layout instead
 * of to hand-authored storyboard constants, which drift as soon as a section
 * changes height.
 *
 * Pure: no DOM access, so it is directly unit-testable.
 */
export function normalizeSectionRanges(
  boxes: readonly MeasuredSectionBox[],
  scrollRange: number,
): readonly SectionRange[] {
  if (scrollRange <= 0) {
    return [];
  }

  return [...boxes]
    .sort((a, b) => a.top - b.top)
    .map((box) => ({
      id: box.id,
      start: clamp01(box.top / scrollRange),
      end: clamp01((box.top + Math.max(0, box.height)) / scrollRange),
    }));
}


export type SectionCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly details: readonly string[];
};

export const siteCopy = {
  brand: "NØR 75",
  skipLink: "Skip to content",
  navigationLabel: "Primary navigation",
  sectionRailLabel: "Experience sections",
} as const;

/**
 * Internal table. The declared windows below are SSR-safe defaults used for the
 * first paint and for no-JS clients; `applyMeasuredSectionRanges` overwrites
 * them once the real layout has been measured.
 */
const sectionTable: SectionTableEntry[] = [
  { id: "intro", label: "Intro", timelineStart: 0, timelineEnd: 0.08, cameraState: "intro" },
  { id: "hero", label: "Hero", timelineStart: 0.08, timelineEnd: 0.2, cameraState: "hero" },
  { id: "productReveal", label: "Product", timelineStart: 0.2, timelineEnd: 0.32, cameraState: "threeQuarter" },
  { id: "materials", label: "Materials", timelineStart: 0.32, timelineEnd: 0.42, cameraState: "macro" },
  { id: "colors", label: "Colors", timelineStart: 0.42, timelineEnd: 0.5, cameraState: "colors" },
  { id: "construction", label: "Construction", timelineStart: 0.5, timelineEnd: 0.64, cameraState: "exploded" },
  { id: "switches", label: "Switches", timelineStart: 0.64, timelineEnd: 0.72, cameraState: "switchMacro" },
  { id: "keycaps", label: "Keycaps", timelineStart: 0.72, timelineEnd: 0.78, cameraState: "keycapMacro" },
  { id: "performance", label: "Performance", timelineStart: 0.78, timelineEnd: 0.84, cameraState: "side" },
  { id: "configurator", label: "Configurator", timelineStart: 0.84, timelineEnd: 0.92, cameraState: "configurator" },
  { id: "finalProduct", label: "Reassembly", timelineStart: 0.92, timelineEnd: 0.97, cameraState: "reassembly" },
  { id: "finale", label: "Finale", timelineStart: 0.97, timelineEnd: 1, cameraState: "finale" },
];

export const sections: readonly Section[] = sectionTable;

const defaultTimelineRanges: ReadonlyMap<string, SectionRange> = new Map(
  sectionTable.map((entry) => [
    entry.id,
    { id: entry.id, start: entry.timelineStart, end: entry.timelineEnd },
  ]),
);

/**
 * The single accessor for a section's timeline window. Returns the measured
 * window when the layout has been measured, otherwise the declared default.
 */
export function getSectionRange(id: string): SectionRange | null {
  const entry = sectionTable.find((candidate) => candidate.id === id);
  if (!entry) {
    return null;
  }

  return { id: entry.id, start: entry.timelineStart, end: entry.timelineEnd };
}

/**
 * Writes measured windows back into the section table so every existing
 * consumer (camera transitions, product timeline, section animations) reads
 * the real layout through the objects it already holds.
 *
 * Rejects a partial set: applying windows for only some sections would leave
 * the schedule inconsistent, so the declared defaults stay in place instead.
 * Returns true only when a window actually changed.
 */
export function applyMeasuredSectionRanges(ranges: readonly SectionRange[]): boolean {
  if (ranges.length !== sectionTable.length) {
    return false;
  }

  const byId = new Map(ranges.map((range) => [range.id, range]));
  const resolved: { entry: SectionTableEntry; range: SectionRange }[] = [];

  for (const entry of sectionTable) {
    const range = byId.get(entry.id);
    if (!range || !(range.end >= range.start)) {
      return false;
    }
    resolved.push({ entry, range });
  }

  let changed = false;
  for (const { entry, range } of resolved) {
    if (entry.timelineStart !== range.start || entry.timelineEnd !== range.end) {
      changed = true;
    }
    entry.timelineStart = range.start;
    entry.timelineEnd = range.end;
  }

  return changed;
}

/** Restores the declared defaults. Used by tests. */
export function resetSectionRangesToDefaults(): void {
  for (const entry of sectionTable) {
    const fallback = defaultTimelineRanges.get(entry.id);
    if (fallback) {
      entry.timelineStart = fallback.start;
      entry.timelineEnd = fallback.end;
    }
  }
}


export const sectionCopy: Readonly<Record<SectionId, SectionCopy>> = {
  intro: {
    eyebrow: "01 / NØR 75",
    title: "Precision in motion.",
    body: "A considered mechanical keyboard, built around the essentials.",
    details: ["75% layout", "Designed for focus"],
  },
  hero: {
    eyebrow: "02 / HERO",
    title: "PRECISION IN MOTION",
    body: "A compact form. A deliberate feel.",
    details: ["NØR 75"],
  },
  productReveal: {
    eyebrow: "03 / PRODUCT REVEAL",
    title: "Every key. In its place.",
    body: "A 75% layout keeps the function row and arrows close without crowding the desk.",
    details: ["Compact footprint", "Dedicated function row"],
  },
  materials: {
    eyebrow: "04 / MATERIALS",
    title: "Engineered surfaces.",
    body: "Aluminum, polymer, PBT, metal and PCB come together in a balanced assembly.",
    details: ["Anodized aluminum case", "Durable PBT keycaps"],
  },
  colors: {
    eyebrow: "05 / COLORS",
    title: "Three case finishes.",
    body: "Obsidian, Silver and Bone give the same precise silhouette a different presence.",
    details: ["Obsidian", "Silver", "Bone"],
  },
  construction: {
    eyebrow: "06 / CONSTRUCTION",
    title: "Built in layers.",
    body: "Keycaps, switches, plate, PCB and case form one serviceable system.",
    details: ["Layered assembly", "Designed for stability"],
  },
  switches: {
    eyebrow: "07 / SWITCHES",
    title: "A deliberate response.",
    body: "Choose the feedback that suits your hands and your room.",
    details: ["Linear", "Tactile", "Clicky"],
  },
  keycaps: {
    eyebrow: "08 / KEYCAPS",
    title: "Texture you can read.",
    body: "PBT caps pair a considered profile with crisp, durable legends.",
    details: ["Ash", "Snow", "Signal"],
  },
  performance: {
    eyebrow: "09 / PERFORMANCE",
    title: "Ready when you are.",
    body: "Responsive polling, low-latency wireless and a long-lasting battery support focused work.",
    details: ["1000 Hz polling", "2.4 GHz wireless", "4000 mAh battery"],
  },
  configurator: {
    eyebrow: "10 / CONFIGURATOR",
    title: "Make it yours.",
    body: "Pair a case finish with a keycap set and switch feel that fits your setup.",
    details: ["Case: Obsidian / Silver / Bone", "Keycaps: Ash / Snow / Signal", "Switch: Linear / Tactile / Clicky"],
  },
  finalProduct: {
    eyebrow: "11 / REASSEMBLY",
    title: "One precise instrument.",
    body: "Each component returns to a single, composed form.",
    details: ["75% mechanical keyboard", "Wireless or wired"],
  },
  finale: {
    eyebrow: "12 / FINALE",
    title: "NØR 75",
    body: "PRECISION IN MOTION",
    details: ["EXPLORE NØR →"],
  },
};

export function getSectionById(id: SectionId): Section {
  const section = sections.find((candidate) => candidate.id === id);
  if (!section) {
    throw new Error(`Missing section data: ${id}`);
  }
  return section;
}

export function getSectionAtProgress(progress: number): Section | null {
  let lastSection: Section | null = null;

  for (const section of sections) {
    lastSection = section;
    if (progress < section.timelineEnd || section.timelineEnd === 1) {
      if (progress >= section.timelineStart) {
        return section;
      }
    }
  }

  return lastSection;
}
