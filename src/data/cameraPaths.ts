import { cameraStates } from "@/data/cameraStates";
import { sections } from "@/data/sections";
import type { CameraEasingName, CameraPath, CameraState } from "@/types/scene";
import { interpolateCameraState } from "@/animation/transitions/cameraTransitions";

/**
 * How far a section opens from the previous section's framing, and how far it
 * closes toward the next.
 *
 * The two sums to 1 on purpose. Section i's exit and section i+1's enter then sit
 * on the same line between the two framings, a fixed small distance apart, and
 * the boundary blend in cameraStateAtProgress closes exactly that gap. Continuity
 * between sections is therefore structural rather than something that has to be
 * maintained by hand.
 */
const ENTER_BLEND = 0.55;
const EXIT_BLEND = 0.45;

/**
 * Per-section easing. Chosen to give the move some character: the macro sections
 * ease out as they arrive so the framing settles rather than arriving at speed,
 * the wide sections use a symmetric inOut, and the finale overshoots very
 * slightly on the way in.
 */
const SECTION_EASINGS: Readonly<Record<string, CameraEasingName>> = {
  intro: "power2.inOut",
  hero: "power3.out",
  productReveal: "power2.inOut",
  materials: "power2.out",
  colors: "power2.out",
  construction: "power3.inOut",
  switches: "expo.out",
  keycaps: "power2.out",
  performance: "sine.inOut",
  configurator: "power2.inOut",
  finalProduct: "circ.inOut",
  finale: "back.out",
};

function stateFor(index: number): CameraState {
  const section = sections[index];
  if (!section) {
    throw new Error("Camera path section data is incomplete.");
  }
  return cameraStates[section.cameraState];
}

/**
 * Builds every section's path from the camera state table.
 *
 * Derived rather than hand-authored so a change to a camera state flows into the
 * path automatically. `mid` is the section's own designed framing; `enter` and
 * `exit` are the approach and the lead-out.
 */
function buildPaths(): readonly CameraPath[] {
  return sections.map((section, index) => {
    const previous = stateFor(Math.max(0, index - 1));
    const own = stateFor(index);
    const next = stateFor(Math.min(sections.length - 1, index + 1));

    return {
      enter: interpolateCameraState(previous, own, ENTER_BLEND),
      mid: own,
      exit: interpolateCameraState(own, next, EXIT_BLEND),
      easing: SECTION_EASINGS[section.id] ?? "power2.inOut",
    };
  });
}

const PATHS = buildPaths();

const BY_ID = new Map<string, CameraPath>(
  sections.map((section, index) => {
    const path = PATHS[index];
    if (!path) {
      throw new Error(`Missing camera path for section ${section.id}.`);
    }
    return [section.id, path];
  }),
);

export function cameraPathFor(sectionId: string): CameraPath {
  const path = BY_ID.get(sectionId);
  if (!path) {
    throw new Error(`Unknown camera path: ${sectionId}`);
  }
  return path;
}

export function cameraPathIndexFor(sectionId: string): number {
  return sections.findIndex((section) => section.id === sectionId);
}

export const SECTION_CAMERA_PATHS: ReadonlyMap<string, CameraPath> = BY_ID;