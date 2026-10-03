import type { CameraState, CameraStateId } from "@/types/scene";

export const cameraStates: Readonly<Record<CameraStateId, CameraState>> = {
  intro: { position: [0, 2.1, 8], target: [0, 0.35, 0], fov: 42 },
  hero: { position: [0, 1.2, 5], target: [0, 0.4, 0], fov: 35 },
  threeQuarter: { position: [3.2, 2.4, 4.8], target: [0, 0.35, 0], fov: 36 },
  side: { position: [5.8, 1.1, 0.2], target: [0, 0.3, 0], fov: 30 },
  // Low three-quarter onto the case edge. The target sits at z 0.55, which is
  // clear of the keycap field (z spans -0.475..0.475), and at y 0.12, on the case
  // side wall, so the finish is what fills the frame rather than the keycaps.
  colors: { position: [2.95, 0.72, 2.35], target: [1.35, 0.12, 0.55], fov: 32 },
  macro: { position: [0.3, 2.4, 2.8], target: [0, 0.28, 0], fov: 28 },
  exploded: { position: [0, 3.6, 7.2], target: [0, 0.8, 0], fov: 40 },
  // Framed to hold the whole travel of the collapsing stack. At full separation
  // the keycaps reach y 1.13; at 7.8 units with fov 34 the vertical extent is
  // about 4.8 units, so the stack stays in frame from separated to assembled.
  reassembly: { position: [0, 2.35, 7.8], target: [0, 0.55, 0], fov: 34 },
  switchMacro: { position: [0.3, 0.95, 1.9], target: [0, 0.28, 0], fov: 26 },
  keycapMacro: { position: [0.15, 2.35, 1.5], target: [0, 0.42, 0], fov: 22 },
  configurator: { position: [0, 1.8, 6.1], target: [0, 0.4, 0], fov: 38 },
  finale: { position: [0, 1.5, 8.2], target: [0, 0.35, 0], fov: 36 },
};
