// Relative import: the unit tests load this module directly through Vitest,
// which does not resolve the "@/" path alias.
import type { CaseColorId, KeycapColorId, SwitchTypeId } from "../types/product";

// Placeholder surface values for the Milestone E configurator. Real values are
// sampled from the GLB material definitions in a later milestone.
export type PlaceholderMaterial = {
  readonly color: string;
  readonly metalness: number;
  readonly roughness: number;
};

export const caseMaterials: Readonly<Record<CaseColorId, PlaceholderMaterial>> = {
  obsidian: { color: "#2b2b2e", metalness: 0.75, roughness: 0.32 },
  silver: { color: "#b8b9bc", metalness: 0.85, roughness: 0.28 },
  bone: { color: "#d8d4cb", metalness: 0.35, roughness: 0.55 },
};

export const keycapMaterials: Readonly<Record<KeycapColorId, PlaceholderMaterial>> = {
  ash: { color: "#5a5a5d", metalness: 0.05, roughness: 0.75 },
  snow: { color: "#e5e5e5", metalness: 0.05, roughness: 0.72 },
  signal: { color: "#e8c547", metalness: 0.05, roughness: 0.72 },
};

// Switch housings differ per type so the configurator's third axis is visible.
// These are still placeholders: the real values are sampled from the GLB switch
// materials. The distinctions chosen here are placeholders that read correctly
// under the scene's three-light rig at the switchMacro framing - neutral and
// smooth for linear, warmer and rougher for tactile, cooler and roughest for
// clicky - so a visitor can tell the three apart in the render.
export const switchMaterials: Readonly<Record<SwitchTypeId, PlaceholderMaterial>> = {
  linear: { color: "#c0c0c0", metalness: 0.1, roughness: 0.55 },
  tactile: { color: "#c8b8a0", metalness: 0.1, roughness: 0.7 },
  clicky: { color: "#a8b0b8", metalness: 0.1, roughness: 0.8 },
};

export type ProductOption = {
  readonly id: string;
  readonly label: string;
  readonly swatch: string;
};

export const CASE_COLOR_IDS: readonly CaseColorId[] = ["obsidian", "silver", "bone"];
export const KEYCAP_COLOR_IDS: readonly KeycapColorId[] = ["ash", "snow", "signal"];
export const SWITCH_TYPE_IDS: readonly SwitchTypeId[] = ["linear", "tactile", "clicky"];

export function isCaseColorId(value: unknown): value is CaseColorId {
  return typeof value === "string" && (CASE_COLOR_IDS as readonly string[]).includes(value);
}

export function isKeycapColorId(value: unknown): value is KeycapColorId {
  return typeof value === "string" && (KEYCAP_COLOR_IDS as readonly string[]).includes(value);
}

export function isSwitchTypeId(value: unknown): value is SwitchTypeId {
  return typeof value === "string" && (SWITCH_TYPE_IDS as readonly string[]).includes(value);
}

const caseEntries = [
  ["obsidian", "Obsidian"],
  ["silver", "Silver"],
  ["bone", "Bone"],
] as const satisfies readonly (readonly [CaseColorId, string])[];

const keycapEntries = [
  ["ash", "Ash"],
  ["snow", "Snow"],
  ["signal", "Signal"],
] as const satisfies readonly (readonly [KeycapColorId, string])[];

const switchEntries = [
  ["linear", "Linear", "Smooth, no bump"],
  ["tactile", "Tactile", "Mid-stroke feedback"],
  ["clicky", "Clicky", "Crisp, audible"],
] as const satisfies readonly (readonly [SwitchTypeId, string, string])[];

export const caseColorOptions: readonly ProductOption[] = caseEntries.map(
  ([id, label]) => ({ id, label, swatch: caseMaterials[id].color }),
);

export const keycapColorOptions: readonly ProductOption[] = keycapEntries.map(
  ([id, label]) => ({ id, label, swatch: keycapMaterials[id].color }),
);

export type SwitchTypeOption = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
};

export const switchTypeOptions: readonly SwitchTypeOption[] = switchEntries.map(
  ([id, label, description]) => ({ id, label, description }),
);