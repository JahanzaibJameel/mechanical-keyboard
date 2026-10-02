"use client";

import { Canvas } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { ProductMotionTarget } from "@/animation/config";
import { ProductScene } from "@/components/three/ProductScene";
import { cameraStates } from "@/data/cameraStates";
import { useProductConfig } from "@/hooks/useProductConfig";
import { BRAND_BACKGROUND, CANVAS_DPR } from "@/lib/constants";
import type { ProductPartsHandle } from "@/types/parts";

export type ProductCanvasProps = {
  readonly productRef: RefObject<ProductMotionTarget>;
};

const emptyProductParts: ProductPartsHandle = {
  root: null,
  case: null,
  plate: null,
  pcb: null,
  switches: null,
  keycaps: null,
};

export function ProductCanvas({ productRef }: ProductCanvasProps) {
  const partsRef = useRef<ProductPartsHandle>({ ...emptyProductParts });
  const { config } = useProductConfig();

  return (
    <Canvas
      dpr={CANVAS_DPR}
      frameloop="demand"
      gl={{ antialias: true }}
      camera={{
        position: cameraStates.intro.position,
        fov: cameraStates.intro.fov,
        near: 0.1,
        far: 100,
      }}
      style={{ background: BRAND_BACKGROUND, width: "100%", height: "100%" }}
    >
      <ProductScene config={config} partsRef={partsRef} productRef={productRef} />
    </Canvas>
  );
}
