// 1 scene unit = 100mm; three.js default camera near/far in ProductCanvas assume this scale.
import {
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

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

const KEYCAP_SIZE = 0.185;
const KEYCAP_CORNER_RADIUS = 0.012;
const KEYCAP_EXTRUDE_DEPTH = 0.1;
const KEYCAP_BEVEL = 0.008;
const KEYCAP_BEAVEL_SEGMENTS = 3;
const KEYCAP_CURVE_SEGMENTS = 6;
const KEYCAP_DISH_DEPTH = 0.008;
const KEYCAP_TAPER = 0.1;

const SWITCH_HOUSING_RADIUS = 0.008;
const SWITCH_STEM_RADIUS = 0.02;
const SWITCH_STEM_HEIGHT = 0.03;
export const SWITCH_STEM_Y = 0.035;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createRoundedSquareShape(size: number, radius: number): Shape {
  const half = size / 2;
  const shape = new Shape();

  shape.moveTo(-half + radius, -half);
  shape.lineTo(half - radius, -half);
  shape.absarc(half - radius, -half + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(half, half - radius);
  shape.absarc(half - radius, half - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(-half + radius, half);
  shape.absarc(-half + radius, half - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-half, -half + radius);
  shape.absarc(-half + radius, -half + radius, radius, Math.PI, (Math.PI * 3) / 2, false);

  return shape;
}

/**
 * A single sculpted keycap: a rounded-square profile extruded along Y with a
 * concave finger dish on the top face and a 10% taper toward the top, matching a
 * real keycap silhouette. One shared geometry is reused across all 75 positions.
 */
export function createKeycapGeometry(): ExtrudeGeometry {
  const shape = createRoundedSquareShape(KEYCAP_SIZE, KEYCAP_CORNER_RADIUS);
  const geometry = new ExtrudeGeometry(shape, {
    depth: KEYCAP_EXTRUDE_DEPTH,
    bevelEnabled: true,
    bevelThickness: KEYCAP_BEVEL,
    bevelSize: KEYCAP_BEVEL,
    bevelSegments: KEYCAP_BEAVEL_SEGMENTS,
    curveSegments: KEYCAP_CURVE_SEGMENTS,
  });

  const position = geometry.attributes.position;
  if (!position) {
    return geometry;
  }
  const halfSize = KEYCAP_SIZE / 2;
  const bevelThickness = KEYCAP_BEVEL;
  const topStart = KEYCAP_EXTRUDE_DEPTH;

  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i);
    if (z < topStart - 1e-6) {
      continue;
    }

    const x = position.getX(i);
    const y = position.getY(i);

    const t = clamp((z - topStart) / bevelThickness, 0, 1);
    const scale = 1 - KEYCAP_TAPER * t;
    const sx = x * scale;
    const sy = y * scale;

    const r = clamp(Math.sqrt((sx / halfSize) ** 2 + (sy / halfSize) ** 2), 0, 1);
    const dish = KEYCAP_DISH_DEPTH * (1 - r * r);

    position.setXYZ(i, sx, sy, z - dish);
  }

  geometry.computeVertexNormals();
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -KEYCAP_EXTRUDE_DEPTH / 2, 0);

  return geometry;
}

/**
 * Switch housing: a rounded box. Shared across all 75 switch positions rather
 * than rebuilt per switch.
 */
export function createSwitchHousingGeometry(): RoundedBoxGeometry {
  return new RoundedBoxGeometry(
    PART_DIMENSIONS.switchRow.size.width,
    PART_DIMENSIONS.switchRow.size.height,
    PART_DIMENSIONS.switchRow.size.depth,
    2,
    SWITCH_HOUSING_RADIUS,
  );
}

/**
 * Switch stem: a short cylinder that sits above the housing. Shared across all
 * 75 switch positions.
 */
export function createSwitchStemGeometry(): CylinderGeometry {
  return new CylinderGeometry(
    SWITCH_STEM_RADIUS,
    SWITCH_STEM_RADIUS,
    SWITCH_STEM_HEIGHT,
    12,
  );
}
