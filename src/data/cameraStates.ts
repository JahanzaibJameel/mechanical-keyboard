import type { CameraState, CameraStateId } from "@/types/scene";

export const cameraStates: Readonly<Record<CameraStateId, CameraState>> = {
  intro: { position: [0, 2.1, 8], target: [0, 0.35, 0], fov: 42 },
  hero: { position: [0, 1.2, 5], target: [0, 0.4, 0], fov: 35 },
  threeQuarter: { position: [3.2, 2.4, 4.8], target: [0, 0.35, 0], fov: 36 },
  side: { position: [5.8, 1.1, 0.2], target: [0, 0.3, 0], fov: 30 },
  top: { position: [0, 7.2, 0.15], target: [0, 0.25, 0], fov: 38 },
  macro: { position: [0.3, 2.4, 2.8], target: [0, 0.28, 0], fov: 28 },
  exploded: { position: [0, 3.6, 7.2], target: [0, 0.8, 0], fov: 40 },
  switchMacro: { position: [0.3, 0.95, 1.9], target: [0, 0.28, 0], fov: 26 },
  keycapMacro: { position: [0.15, 2.35, 1.5], target: [0, 0.42, 0], fov: 22 },
  configurator: { position: [0, 1.8, 6.1], target: [0, 0.4, 0], fov: 38 },
  finale: { position: [0, 1.6, 5.8], target: [0, 0.35, 0], fov: 36 },
};
