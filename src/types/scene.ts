export type CameraState = {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov: number;
  readonly roll?: number;
  readonly easing?: string;
};

/**
 * A GSAP ease name, resolved by src/animation/transitions/cameraEasing.ts.
 * Kept as a string rather than a function so a path stays plain data that can
 * live in src/data and be asserted in tests.
 */
export type CameraEasingName =
  | "none"
  | "power1.inOut"
  | "power2.inOut"
  | "power2.out"
  | "power3.out"
  | "power3.inOut"
  | "expo.out"
  | "sine.inOut"
  | "circ.inOut"
  | "back.out";

/**
 * A section's camera move, as three keyframes plus the ease that shapes it.
 *
 * `enter` is the framing the section opens on, `mid` is the framing it is
 * actually about, and `exit` is what leads into the next section. A section with
 * no distinct shape of its own sets mid equal to enter.
 */
export type CameraPath = {
  readonly enter: CameraState;
  readonly mid: CameraState;
  readonly exit: CameraState;
  readonly easing: CameraEasingName;
};

export type CameraStateId =
  | "intro"
  | "hero"
  | "threeQuarter"
  | "side"
  | "colors"
  | "macro"
  | "exploded"
  | "reassembly"
  | "switchMacro"
  | "keycapMacro"
  | "configurator"
  | "finale";
