export type CaseColorId = "obsidian" | "silver" | "bone";
export type KeycapColorId = "ash" | "snow" | "signal";
export type SwitchTypeId = "linear" | "tactile" | "clicky";

export type ProductConfig = {
  readonly case: CaseColorId;
  readonly keycaps: KeycapColorId;
  readonly switchType: SwitchTypeId;
};

export const DEFAULT_PRODUCT_CONFIG: ProductConfig = {
  case: "obsidian",
  keycaps: "ash",
  switchType: "linear",
} as const;