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

// Switch type has no visual effect yet, so every option resolves to the same
// placeholder until the GLB switch materials land.
export const switchMaterials: Readonly<Record<SwitchTypeId, PlaceholderMaterial>> = {
  linear: { color: "#c0c0c0", metalness: 0.1, roughness: 0.6 },
  tactile: { color: "#c0c0c0", metalness: 0.1, roughness: 0.6 },
  clicky: { color: "#c0c0c0", metalness: 0.1, roughness: 0.6 },
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