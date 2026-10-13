"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { Mesh, type Object3D, Vector2 } from "three";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ProductMotionTarget } from "@/animation/config";
import { EXPLOSION_DAMPING, EXPLOSION_SETTLE_EPSILON, layerExplosion, type ExplosionLayer } from "@/animation/timelines/explosionStagger";
import { updateProductTimeline } from "@/animation/timelines/productTimeline";
import { getSectionLocalProgress } from "@/animation/transitions/sectionTransitions";
import { caseMaterials, keycapMaterials, switchMaterials } from "@/data/materials";
import { PART_DIMENSIONS } from "@/data/productGeometry";
import { createKeycapGeometry, createSwitchHousingGeometry, createSwitchStemGeometry, SWITCH_STEM_Y } from "@/data/productGeometry";
import { sections } from "@/data/sections";
import {
  heroSwitchPress,
  registerHeroSwitchInvalidation,
  setHeroSwitchPressed,
} from "@/components/three/heroSwitchPress";
import { experienceProgressValue } from "@/hooks/useExperienceProgress";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { applyBrushedAluminum } from "@/three/materials/brushedAluminum";
import { initKeycapMotion, updateKeycapMotion, applyKeycapTransform, setCursorNDC, setReducedMotion as setKeycapReducedMotion } from "@/components/three/keycapMotion";
import type { ProductPartsHandle } from "@/types/parts";
import type { ProductConfig } from "@/types/product";

type Props = {
  readonly productRef: RefObject<ProductMotionTarget>;
  readonly partsRef: RefObject<ProductPartsHandle>;
  readonly config: ProductConfig;
  readonly isLiteTier: boolean;
};

const EXPLOSION_COMPLETE_AT = 0.6;

const HERO_SWITCH_ROW = 2;
const HERO_SWITCH_COLUMN = 7;
const SWITCH_PRESS_TRAVEL = 0.045;
const SWITCH_PRESS_DAMPING = 18;
const SWITCH_PRESS_SETTLE_EPSILON = 0.001;

const CONSTRUCTION_SECTION = sections.find((section) => section.id === "construction");
const FINAL_PRODUCT_SECTION = sections.find((section) => section.id === "finalProduct");

const EXPLODED_RIG: ReadonlyArray<{
  readonly key: keyof ProductPartsHandle;
  readonly layer: ExplosionLayer;
  readonly assembledY: number;
  readonly offset: number;
}> = [
  { key: "case", layer: "case", assembledY: PART_DIMENSIONS.case.y, offset: 0.35 },
  { key: "plate", layer: "plate", assembledY: PART_DIMENSIONS.plate.y, offset: 0.25 },
  { key: "pcb", layer: "pcb", assembledY: PART_DIMENSIONS.pcb.y, offset: 0.15 },
  { key: "switches", layer: "switches", assembledY: PART_DIMENSIONS.switchRow.baseY, offset: 0.12 },
  { key: "keycaps", layer: "keycaps", assembledY: PART_DIMENSIONS.keycap.baseY, offset: 0.08 },
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

function computeExplodedState(progress: number): number {
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

type PositionedObject = {
  readonly position: { y: number };
};

export function ProductParts({ productRef, partsRef, config, isLiteTier }: Props) {
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);
  const explodedRef = useRef(0);
  const heroSwitchRef = useRef<THREE.Group | null>(null);
  const heroSwitchPressedRef = useRef(0);
  const keycapMeshesRef = useRef<Map<number, Mesh>>(new Map());
  const keycapInitializedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const caseMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const plateMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const pcbMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvasRef.current = canvas;
    }
  }, []);

  useEffect(() => registerHeroSwitchInvalidation(invalidate), [invalidate]);

  useEffect(() => {
    setKeycapReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const caseMaterial = caseMaterials[config.case];
  const keycapMaterial = keycapMaterials[config.keycaps];
  const switchMaterial = switchMaterials[config.switchType];

  // Apply brushed aluminum shaders to materials when they are ready
  useLayoutEffect(() => {
    if (caseMaterialRef.current) {
      try {
        applyBrushedAluminum(caseMaterialRef.current, {
          anisoDir: 'x',
          intensity: 0.3,
        });
      } catch (e) {
        console.warn('Failed to apply brushed aluminum shader to case:', e);
      }
    }
  }, [caseMaterialRef]);

  useLayoutEffect(() => {
    if (plateMaterialRef.current) {
      try {
        applyBrushedAluminum(plateMaterialRef.current, {
          anisoDir: 'xz',
          intensity: 0.2,
        });
      } catch (e) {
        console.warn('Failed to apply brushed aluminum shader to plate:', e);
      }
    }
  }, [plateMaterialRef]);

  useLayoutEffect(() => {
    if (pcbMaterialRef.current) {
      try {
        applyBrushedAluminum(pcbMaterialRef.current, {
          anisoDir: 'none',
          intensity: 0.1,
        });
      } catch (e) {
        console.warn('Failed to apply brushed aluminum shader to pcb:', e);
      }
    }
  }, [pcbMaterialRef]);

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

  const handlePointerMove = useCallback((event: PointerEvent): void => {
    if (reducedMotion || isLiteTier) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    setCursorNDC(new Vector2(x, y));
    invalidate();
  }, [reducedMotion, isLiteTier, invalidate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointermove", handlePointerMove);
    return () => canvas.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  useFrame((_, delta) => {
    const progress = experienceProgressValue.current;
    updateProductTimeline(progress, productRef.current);

    const root = partsRef.current.root;
    if (root) {
      root.scale.setScalar(productRef.current.scale);
      root.traverse((object) => applyPartOpacity(object, productRef.current.opacity));
    }

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
      object.position.y =
        part.assembledY + part.offset * layerExplosion(part.layer, explodedRef.current);
    }

    if (!keycapInitializedRef.current) {
      const keycapStates: Array<{ id: number; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }> = [];
      const keycapsGroup = partsRef.current.keycaps;
      if (keycapsGroup) {
        keycapsGroup.traverse((object) => {
          if (object instanceof Mesh && object.name && object.name.startsWith("KEYCAP_")) {
            const match = object.name.match(/KEYCAP_(\d+)_(\d+)/);
            if (match && match[1] && match[2]) {
              const row = parseInt(match[1], 10);
              const column = parseInt(match[2], 10);
              const id = (row - 1) * columns + (column - 1);
              keycapStates.push({
                id,
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone(),
              });
              keycapMeshesRef.current.set(id, object);
            }
          }
        });
      }
      if (keycapStates.length > 0) {
        initKeycapMotion(keycapStates, {}, {
          reducedMotion,
          onInvalidate: invalidate,
          patchMaterial: (material, keycapId, state) => {
            material.userData.keycapState = {
              pressOffset: state.ripplePhase,
              morphProgress: state.morphProgress,
              time: performance.now() / 1000,
            };
          },
        });
        keycapInitializedRef.current = true;
      }
    }

    if (keycapInitializedRef.current) {
      updateKeycapMotion(camera, delta);
      for (const [id, mesh] of keycapMeshesRef.current) {
        applyKeycapTransform(mesh, id);
      }
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
        <primitive object={new RoundedBoxGeometry(3.2, 0.15, 1.35, 8, 0.04)} />
        <meshStandardMaterial
          ref={caseMaterialRef}
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
        <boxGeometry args={[2.95, 0.015, 1.15]} />
        <meshStandardMaterial
          ref={plateMaterialRef}
          color="#8d8f92"
          metalness={0.6}
          roughness={0.45}
        />
      </mesh>

      <mesh
        name="NOR75_PCB"
        ref={(mesh) => setPart("pcb", mesh)}
        position={[0, PART_DIMENSIONS.pcb.y, 0]}
      >
        <boxGeometry args={[2.95, 0.016, 1.15]} />
        <meshStandardMaterial
          ref={pcbMaterialRef}
          color="#1f3b2c"
          metalness={0.1}
          roughness={0.8}
        />
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
              <group
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
                <mesh
                  name="SWITCH_HOUSING"
                  position={[0, 0, 0]}
                >
                  <primitive object={createSwitchHousingGeometry()} />
                  <meshStandardMaterial
                    color={switchMaterial.color}
                    metalness={switchMaterial.metalness}
                    roughness={switchMaterial.roughness}
                  />
                </mesh>
                <mesh
                  name="SWITCH_STEM"
                  position={[0, SWITCH_STEM_Y, 0]}
                >
                  <primitive object={createSwitchStemGeometry()} />
                  <meshStandardMaterial
                    color={switchMaterial.color}
                    metalness={switchMaterial.metalness}
                    roughness={switchMaterial.roughness}
                  />
                </mesh>
              </group>
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
              <primitive object={createKeycapGeometry()} />
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

export { computeExplodedState };