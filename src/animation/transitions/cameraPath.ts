import type { CameraPath, CameraState } from "../../types/scene";
import { interpolateCameraState } from "./cameraTransitions";
import { resolveCameraEase } from "./cameraEasing";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Evaluates a camera path at t in 0..1, walking enter to mid over the first half
 * and mid to exit over the second, with the path's easing applied to each half.
 *
 * Exact at the keyframes: t of 0 returns enter, 0.5 returns mid, 1 returns exit.
 * That matters because the boundary blend relies on the previous section's exit
 * and the next section's enter being able to meet exactly.
 */
export function evaluateCameraPath(path: CameraPath, t: number): CameraState {
  const clamped = clamp01(t);
  const ease = resolveCameraEase(path.easing);

  if (clamped <= 0) {
    return path.enter;
  }
  if (clamped >= 1) {
    return path.exit;
  }
  if (clamped === 0.5) {
    return path.mid;
  }

  if (clamped < 0.5) {
    return interpolateCameraState(path.enter, path.mid, ease(clamped * 2));
  }

  return interpolateCameraState(path.mid, path.exit, ease((clamped - 0.5) * 2));
}