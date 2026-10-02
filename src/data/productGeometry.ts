// 1 scene unit = 100mm; three.js default camera near/far in ProductCanvas assume this scale.
export const KEYBOARD_DIMENSIONS = {
  width: 3.2,
  depth: 1.35,
  totalHeight: 0.35,
} as const;

export const PART_DIMENSIONS = {
  case: {
    width: 3.2,
    height: 0.15,
    depth: 1.35,
    y: 0.075,
  },
  plate: {
    width: 2.95,
    height: 0.015,
    depth: 1.15,
    y: 0.158,
  },
  pcb: {
    width: 2.95,
    height: 0.016,
    depth: 1.15,
    y: 0.182,
  },
  switchRow: {
    count: 5,
    spacingX: 0.19,
    spacingZ: 0.19,
    size: { width: 0.19, height: 0.05, depth: 0.19 },
    baseY: 0.23,
  },
  keycap: {
    count: 15,
    rows: 5,
    spacingX: 0.19,
    spacingZ: 0.19,
    size: { width: 0.185, height: 0.12, depth: 0.185 },
    baseY: 0.32,
  },
} as const;
