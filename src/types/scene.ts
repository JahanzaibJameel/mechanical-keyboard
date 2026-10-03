export type CameraState = {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov: number;
  readonly roll?: number;
  readonly easing?: string;
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
