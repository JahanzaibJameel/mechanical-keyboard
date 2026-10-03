// The product specification as text.
//
// This is the accessible equivalent of the 3D scene: a screen-reader user gets
// these rows where a sighted user gets the model, and the fallback image points
// here. It is deliberately not decorative and not summary prose.
//
// Weight is the one value with no source yet. The keyboard is 320 x 135 x 35 mm
// in the scene geometry, and the case is described as CNC aluminium, but nothing
// in the codebase knows what it weighs. Rather than invent a number, the row
// states that.

export type SpecRow = {
  readonly label: string;
  readonly value: string;
};

export const SPEC_ROWS: readonly SpecRow[] = [
  { label: "Layout", value: "75%" },
  { label: "Connectivity", value: "2.4 GHz wireless / USB-C wired" },
  { label: "Polling", value: "1000 Hz" },
  { label: "Battery", value: "4000 mAh" },
  { label: "Case", value: "CNC aluminum" },
  { label: "Keycaps", value: "PBT double-shot" },
  { label: "Dimensions", value: "320 × 135 × 35 mm" },
  { label: "Weight", value: "Not yet specified" },
];

export const SPEC_TABLE_ID = "nor75-spec";

export const SPEC_TABLE_CAPTION = "NØR 75 specifications";

/** Flat sentence form, used as the canvas wrapper's accessible description. */
export const SPEC_SUMMARY = SPEC_ROWS.map((row) => `${row.label}: ${row.value}`).join(
  ". ",
);