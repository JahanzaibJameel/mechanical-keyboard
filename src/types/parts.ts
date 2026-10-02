import type { Group, Mesh } from "three";

export type ProductPartsHandle = {
  readonly root: Group | null;
  readonly case: Mesh | null;
  readonly plate: Mesh | null;
  readonly pcb: Mesh | null;
  readonly switches: Group | null;
  readonly keycaps: Group | null;
};
