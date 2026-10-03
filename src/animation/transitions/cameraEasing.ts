import type { CameraEasingName } from "../../types/scene";

/**
 * GSAP ease names, resolved to plain functions.
 *
 * Kept as a local table rather than importing GSAP so path evaluation stays pure
 * and testable with no renderer and no animation runtime. The names match GSAP's
 * so a path can be re-timed by GSAP later without the data changing shape.
 *
 * All of these map 0 to 0 and 1 to 1, which is what lets a path be evaluated at
 * its endpoints and treated as exact.
 */
const EASES: Readonly<Record<CameraEasingName, (t: number) => number>> = {
  none: (t) => t,
  "power1.inOut": (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  "power2.inOut": (t) =>
    t < 0.5 ? 2 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  "power3.out": (t) => 1 - Math.pow(1 - t, 3),
  "power3.inOut": (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  "power2.out": (t) => 1 - Math.pow(1 - t, 2),
  "expo.out": (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  "sine.inOut": (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  "circ.inOut": (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  // A mild overshoot, well under back.out(1.7). Ends exactly on 1 so a path
  // still arrives precisely at its exit keyframe.
  "back.out": (t) => {
    const c = 1.2;
    const shifted = t - 1;
    return 1 + (c + 1) * Math.pow(shifted, 3) + c * Math.pow(shifted, 2);
  },
};

export function resolveCameraEase(name: CameraEasingName): (t: number) => number {
  return EASES[name];
}

/** Every ease name a CameraPath may use, for exhaustive checks in tests. */
export const CAMERA_EASING_NAMES = Object.keys(EASES) as CameraEasingName[];