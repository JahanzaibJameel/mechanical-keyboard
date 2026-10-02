import type { CameraState, CameraStateId } from "../../types/scene";
import { cameraStates } from "../../data/cameraStates";
import { getSectionAtProgress, sections } from "../../data/sections";

function interpolate(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function interpolateVector(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  amount: number,
): readonly [number, number, number] {
  return [
    interpolate(from[0], to[0], amount),
    interpolate(from[1], to[1], amount),
    interpolate(from[2], to[2], amount),
  ];
}

export type ResolvedCameraStates = {
  readonly fromSectionId: string;
  readonly toSectionId: string;
  readonly fromStateId: CameraStateId;
  readonly toStateId: CameraStateId;
  readonly from: CameraState;
  readonly to: CameraState;
  readonly t: number;
};

export function resolveCameraStates(progress: number): ResolvedCameraStates {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  if (clampedProgress === 1) {
    const fromSection = sections[sections.length - 2];
    const toSection = sections[sections.length - 1];
    if (!fromSection || !toSection) {
      throw new Error("Camera transition section data is incomplete.");
    }
    return {
      fromSectionId: fromSection.id,
      toSectionId: toSection.id,
      fromStateId: fromSection.cameraState,
      toStateId: toSection.cameraState,
      from: cameraStates[fromSection.cameraState],
      to: cameraStates[toSection.cameraState],
      t: 1,
    };
  }

  const section = getSectionAtProgress(clampedProgress) ?? sections[0];
  if (!section) {
    throw new Error("Camera transition section data is empty.");
  }

  const sectionIndex = sections.findIndex((candidate) => candidate.id === section.id);
  const nextSection = sections[sectionIndex + 1] ?? section;
  const range = section.timelineEnd - section.timelineStart;
  const localProgress =
    range > 0
      ? Math.min(1, Math.max(0, (clampedProgress - section.timelineStart) / range))
      : 1;

  return {
    fromSectionId: section.id,
    toSectionId: nextSection.id,
    fromStateId: section.cameraState,
    toStateId: nextSection.cameraState,
    from: cameraStates[section.cameraState],
    to: cameraStates[nextSection.cameraState],
    t: localProgress,
  };
}

export function interpolateCameraState(
  from: CameraState,
  to: CameraState,
  progress: number,
): CameraState {
  const amount = Math.min(1, Math.max(0, progress));
  if (amount === 0) {
    return from;
  }
  if (amount === 1) {
    return to;
  }

  return {
    position: interpolateVector(from.position, to.position, amount),
    target: interpolateVector(from.target, to.target, amount),
    fov: interpolate(from.fov, to.fov, amount),
    ...(from.roll !== undefined && to.roll !== undefined
      ? { roll: interpolate(from.roll, to.roll, amount) }
      : {}),
    ...(to.easing !== undefined ? { easing: to.easing } : {}),
  };
}

export function cameraStateAtProgress(
  progress: number,
  reducedMotion: boolean,
  activeSectionId: string | null,
): CameraState {
  const pair = resolveCameraStates(progress);
  const section = getSectionAtProgress(progress);
  if (!section) {
    return cameraStates.intro;
  }

  if (reducedMotion) {
    const activeSection = sections.find(
      (candidate) => candidate.id === activeSectionId,
    );
    return activeSection ? cameraStates[activeSection.cameraState] : pair.from;
  }

  const easedAmount = pair.t * pair.t * (3 - 2 * pair.t);
  return interpolateCameraState(pair.from, pair.to, easedAmount);
}
