import type { Vector3 } from "three";

export type CameraRigTarget = {
  readonly position: Vector3;
  readonly target: Vector3;
  fov: number;
};

export type ProductMotionTarget = {
  scale: number;
  opacity: number;
};

export const HERO_ANIMATION = {
  cameraDuration: 1.2,
  productDuration: 1,
  productDelay: 0.2,
  textDuration: 0.9,
  textDelay: 0.3,
  characterStagger: 0.025,
  productStartScale: 0.85,
  ease: "power3.out",
} as const;