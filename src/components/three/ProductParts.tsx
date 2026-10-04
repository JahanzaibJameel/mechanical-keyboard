import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import { Mesh, type Object3D } from "three";
import type { ProductMotionTarget } from "@/animation/config";
import { EXPLODED_OFFSETS } from "@/animation/timelines/constructionTimeline";
import {
  layerExplosion,
  type ExplosionLayer,
} from "@/animation/timelines/explosionStagger";
import { updateProductTimeline } from "@/animation/timelines/productTimeline";
import { getSectionLocalProgress } from "@/animation/transitions/sectionTransitions";
import { caseMaterials, keycapMaterials, switchMaterials } from "@/data/materials";
import { PART_DIMENSIONS } from "@/data/productGeometry";
import { sections } from "@/data/sections";
import {
  heroSwitchPress,
  registerHeroSwitchInvalidation,
  setHeroSwitchPressed,
} from "@/components/three/heroSwitchPress";
import { experienceProgressValue } from "@/hooks/useExperienceProgress";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ProductPartsHandle } from "@/types/parts";
import type { ProductConfig } from "@/types/product";

type Props = {
  readonly productRef: RefObject<ProductMotionTarget>;
  readonly partsRef: RefObject<ProductPartsHandle>;
  readonly config: ProductConfig;
};

/** Minimal structural shape of a three.js object that owns a position. */
type PositionedObject = {
  readonly position: { y: number };
};

type ExplodedRigPart = {
  readonly key: "case" | "plate" | "pcb" | "switches" | "keycaps";
  /** Same identity as key, named for the stagger schedule it selects. */
  readonly layer: ExplosionLayer;
  readonly assembledY: number;
  readonly offset: number;
};

const EXPLOSION_DAMPING = 6;
const EXPLOSION_SETTLE_EPSILON = 0.0005;

/**
 * Fraction of the construction range over which the layers finish separating.
 * The camera starts moving from the exploded framing towards the switch macro
 * as soon as the construction section begins, so holding full separation until
 * the very end would show it only once the camera has already left. Completing
 * at 60% keeps all five layers visibly apart for the back half of the section.
 */
const EXPLOSION_COMPLETE_AT = 0.6;

/**
 * The switch in Section 07 that the camera frames and that can be pressed.
 * The grid is 5 rows by 15 columns, so row 2 / column 7 sits at the origin,
 * which is what the `switchMacro` camera state looks at.
 */
const HERO_SWITCH_ROW = 2;
const HERO_SWITCH_COLUMN = 7;
const SWITCH_PRESS_TRAVEL = 0.045;
const SWITCH_PRESS_DAMPING = 18;
const SWITCH_PRESS_SETTLE_EPSILON = 0.001;

const CONSTRUCTION_SECTION = sections.find((section) => section.id === "construction");
const FINAL_PRODUCT_SECTION = sections.find((section) => section.id === "finalProduct");

/**
 * Explosion schedule (owned by ProductParts; section components never drive it):
 *   0 -> 1 through Section 06 (Construction)
 *   hold at 1 through Sections 07-10 (Switches, Keycaps, Performance, Configurator)
 *   1 -> 0 through Section 11 (Reassembly)
 *   hold at 0 through Section 12 (Finale)
 */
export function computeExplodedState(progress: number): number {
  const constructionLocal = CONSTRUCTION_SECTION
    ? getSectionLocalProgress(progress, CONSTRUCTION_SECTION)
    : 0;
  const constructionExploded = Math.min(1, constructionLocal / EXPLOSION_COMPLETE_AT);
  const explosionProgress = constructionExploded * constructionExploded * (3 - 2 * constructionExploded);

  const finalProductLocal = FINAL_PRODUCT_SECTION
    ? getSectionLocalProgress(progress, FINAL_PRODUCT_SECTION)
    : 0;
  const reassemblyProgress = finalProductLocal * finalProductLocal * (3 - 2 * finalProductLocal);
  const reassemblyExploded = 1 - reassemblyProgress;

  if (finalProductLocal >= 1) {
    return 0;
  }
  if (finalProductLocal > 0) {
    return reassemblyExploded;
  }
  return explosionProgress;
}

/** Exported for schedule verification tests; section components never drive it. */

/**
 * Assembled rest height plus the vertical offset applied while exploded,
 * per part. Offsets come from the construction timeline.
 */
const EXPLODED_RIG: readonly ExplodedRigPart[] = [
  { key: "case", layer: "case", assembledY: PART_DIMENSIONS.case.y, offset: EXPLODED_OFFSETS.case ?? 0 },
  { key: "plate", layer: "plate", assembledY: PART_DIMENSIONS.plate.y, offset: EXPLODED_OFFSETS.plate ?? 0 },
  { key: "pcb", layer: "pcb", assembledY: PART_DIMENSIONS.pcb.y, offset: EXPLODED_OFFSETS.pcb ?? 0 },
  {
    key: "switches",
    layer: "switches",
    assembledY: PART_DIMENSIONS.switchRow.baseY,
    offset: EXPLODED_OFFSETS.switch ?? 0,
  },
  {
    key: "keycaps",
    layer: "keycaps",
    assembledY: PART_DIMENSIONS.keycap.baseY,
    offset: EXPLODED_OFFSETS.keycap ?? 0,
  },
];

function applyPartOpacity(object: Object3D, opacity: number): void {
  if (!(object instanceof Mesh)) {
    return;
  }

  if (Array.isArray(object.material)) {
    for (const material of object.material) {
      material.opacity = opacity;
    }
    return;
  }

  object.material.opacity = opacity;
}

export function ProductParts({ productRef, partsRef, config }: Props) {
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const explodedRef = useRef(0);
  const heroSwitchRef = useRef<Mesh | null>(null);
  const heroSwitchPressedRef = useRef(0);

  useEffect(() => registerHeroSwitchInvalidation(invalidate), [invalidate]);

  const caseMaterial = caseMaterials[config.case];
  const keycapMaterial = keycapMaterials[config.keycaps];
  const switchMaterial = switchMaterials[config.switchType];

  const columns = PART_DIMENSIONS.keycap.count;
  const switchRows = PART_DIMENSIONS.switchRow.count;
  const keycapRows = PART_DIMENSIONS.keycap.rows;

  const setPart = <Key extends keyof ProductPartsHandle>(
    key: Key,
    value: ProductPartsHandle[Key],
  ): void => {
    partsRef.current = { ...partsRef.current, [key]: value };
  };

  const handleSwitchPressStart = (event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation();
    setHeroSwitchPressed(true);
  };

  const handleSwitchPressEnd = (): void => {
    setHeroSwitchPressed(false);
  };

  const handleSwitchPointerOver = (event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
  };

  const handleSwitchPointerOut = (): void => {
    handleSwitchPressEnd();
    document.body.style.cursor = "";
  };

  useFrame((_, delta) => {
    const progress = experienceProgressValue.current;
    updateProductTimeline(progress, productRef.current);

    const root = partsRef.current.root;
    if (root) {
      root.scale.setScalar(productRef.current.scale);
      root.traverse((object) => applyPartOpacity(object, productRef.current.opacity));
    }

    // Global explosion schedule owned by ProductParts; section components never drive it.
    const exploded = computeExplodedState(progress);

    if (reducedMotion) {
      explodedRef.current = exploded;
    } else {
      const step = Math.min(delta, 0.1);
      const alpha = 1 - Math.exp(-EXPLOSION_DAMPING * step);
      explodedRef.current += (exploded - explodedRef.current) * alpha;

      if (Math.abs(exploded - explodedRef.current) > EXPLOSION_SETTLE_EPSILON) {
        invalidate();
      }
    }

    for (const part of EXPLODED_RIG) {
      const object: PositionedObject | null = partsRef.current[part.key];
      if (!object) {
        continue;
      }
      // Each layer has its own start offset within the section and its own
      // overshoot, rather than all five sharing one scalar. The shared amount
      // from computeExplodedState is unchanged, so the schedule and the existing
      // tests are untouched; only the per-layer timing is new.
      object.position.y =
        part.assembledY + part.offset * layerExplosion(part.layer, explodedRef.current);
    }

    const heroSwitch = heroSwitchRef.current;
    if (heroSwitch) {
      const pressTarget = heroSwitchPress.pressed ? 1 : 0;

      if (reducedMotion) {
        heroSwitchPressedRef.current = pressTarget;
      } else {
        const step = Math.min(delta, 0.1);
        const alpha = 1 - Math.exp(-SWITCH_PRESS_DAMPING * step);
        const next = heroSwitchPressedRef.current + (pressTarget - heroSwitchPressedRef.current) * alpha;

        if (Math.abs(pressTarget - next) > SWITCH_PRESS_SETTLE_EPSILON) {
          heroSwitchPressedRef.current = next;
          invalidate();
        } else {
          heroSwitchPressedRef.current = pressTarget;
        }
      }

      heroSwitch.position.y = -SWITCH_PRESS_TRAVEL * heroSwitchPressedRef.current;
    }
  });

  return (
    <group name="NOR75_ROOT" ref={(group) => setPart("root", group)}>
      <mesh
        name="NOR75_CASE"
        ref={(mesh) => setPart("case", mesh)}
        position={[0, PART_DIMENSIONS.case.y, 0]}
      >
        <boxGeometry
          args={[
            PART_DIMENSIONS.case.width,
            PART_DIMENSIONS.case.height,
            PART_DIMENSIONS.case.depth,
          ]}
        />
        <meshStandardMaterial
          color={caseMaterial.color}
          metalness={caseMaterial.metalness}
          roughness={caseMaterial.roughness}
        />
      </mesh>

      <mesh
        name="NOR75_PLATE"
        ref={(mesh) => setPart("plate", mesh)}
        position={[0, PART_DIMENSIONS.plate.y, 0]}
      >
        <boxGeometry
          args={[
            PART_DIMENSIONS.plate.width,
            PART_DIMENSIONS.plate.height,
            PART_DIMENSIONS.plate.depth,
          ]}
        />
        <meshStandardMaterial color="#8d8f92" metalness={0.6} roughness={0.45} />
      </mesh>

      <mesh
        name="NOR75_PCB"
        ref={(mesh) => setPart("pcb", mesh)}
        position={[0, PART_DIMENSIONS.pcb.y, 0]}
      >
        <boxGeometry
          args={[
            PART_DIMENSIONS.pcb.width,
            PART_DIMENSIONS.pcb.height,
            PART_DIMENSIONS.pcb.depth,
          ]}
        />
        <meshStandardMaterial color="#1f3b2c" metalness={0.1} roughness={0.8} />
      </mesh>

      <group
        name="NOR75_SWITCHES"
        ref={(group) => setPart("switches", group)}
        position={[0, PART_DIMENSIONS.switchRow.baseY, 0]}
      >
        {Array.from({ length: switchRows }, (_, row) =>
          Array.from({ length: columns }, (_, column) => {
            const isHeroSwitch = row === HERO_SWITCH_ROW && column === HERO_SWITCH_COLUMN;

            return (
              <mesh
                key={`switch-${row + 1}-${column + 1}`}
                name={isHeroSwitch ? "SWITCH_HERO" : `SWITCH_${row + 1}_${column + 1}`}
                position={[
                  (column - (columns - 1) / 2) * PART_DIMENSIONS.switchRow.spacingX,
                  0,
                  (row - (switchRows - 1) / 2) * PART_DIMENSIONS.switchRow.spacingZ,
                ]}
                ref={isHeroSwitch ? (mesh) => (heroSwitchRef.current = mesh) : undefined}
                onPointerDown={isHeroSwitch ? handleSwitchPressStart : undefined}
                onPointerUp={isHeroSwitch ? handleSwitchPressEnd : undefined}
                onPointerOut={isHeroSwitch ? handleSwitchPointerOut : undefined}
                onPointerOver={isHeroSwitch ? handleSwitchPointerOver : undefined}
              >
                <boxGeometry
                  args={[
                    PART_DIMENSIONS.switchRow.size.width,
                    PART_DIMENSIONS.switchRow.size.height,
                    PART_DIMENSIONS.switchRow.size.depth,
                  ]}
                />
                <meshStandardMaterial
                  color={switchMaterial.color}
                  metalness={switchMaterial.metalness}
                  roughness={switchMaterial.roughness}
                />
              </mesh>
            );
          }))}
      </group>

      <group
        name="NOR75_KEYCAPS"
        ref={(group) => setPart("keycaps", group)}
        position={[0, PART_DIMENSIONS.keycap.baseY, 0]}
      >
        {Array.from({ length: keycapRows }, (_, row) =>
          Array.from({ length: columns }, (_, column) => (
            <mesh
              key={`keycap-${row + 1}-${column + 1}`}
              name={`KEYCAP_${row + 1}_${column + 1}`}
              position={[
                (column - (columns - 1) / 2) * PART_DIMENSIONS.keycap.spacingX,
                0,
                (row - (keycapRows - 1) / 2) * PART_DIMENSIONS.keycap.spacingZ,
              ]}
            >
              <boxGeometry
                args={[
                  PART_DIMENSIONS.keycap.size.width,
                  PART_DIMENSIONS.keycap.size.height,
                  PART_DIMENSIONS.keycap.size.depth,
                ]}
              />
              <meshStandardMaterial
                color={keycapMaterial.color}
                metalness={keycapMaterial.metalness}
                roughness={keycapMaterial.roughness}
              />
            </mesh>
          )))}
      </group>
    </group>
  );
}
