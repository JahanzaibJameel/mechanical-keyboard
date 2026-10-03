"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import type { ProductMotionTarget } from "@/animation/config";
import { ProductScene } from "@/components/three/ProductScene";
import { cameraStates } from "@/data/cameraStates";
import { useProductConfig } from "@/hooks/useProductConfig";
import { BRAND_BACKGROUND, CANVAS_DPR } from "@/lib/constants";
import type { ProductPartsHandle } from "@/types/parts";

export type ProductCanvasProps = {
  readonly productRef: RefObject<ProductMotionTarget>;
  /** Fired once, from the first rendered frame. */
  readonly onFirstFrame?: () => void;
  /** Fired when the browser takes the graphics context away. */
  readonly onContextLost?: () => void;
};

const emptyProductParts: ProductPartsHandle = {
  root: null,
  case: null,
  plate: null,
  pcb: null,
  switches: null,
  keycaps: null,
};

/**
 * Reports the first rendered frame. The watchdog in ExperienceCanvas needs to
 * know that rendering actually started, not merely that a context was created,
 * because a context can be handed out and then never draw.
 */
function FirstFrameSignal({ onFirstFrame }: { readonly onFirstFrame?: () => void }) {
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) {
      return;
    }
    reported.current = true;
    onFirstFrame?.();
  });

  return null;
}

/**
 * Watches for the browser revoking the graphics context, which happens on a GPU
 * reset, a driver change, or a tab being backgrounded long enough for the
 * compositor to drop it. preventDefault is what tells the browser the context
 * may be restored; without it the context is not restorable.
 */
function ContextLossReporter({
  onContextLost,
}: {
  readonly onContextLost?: () => void;
}) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const element = gl.domElement;

    const handleLost = (event: Event): void => {
      event.preventDefault();
      onContextLost?.();
    };

    element.addEventListener("webglcontextlost", handleLost, false);

    return () => {
      element.removeEventListener("webglcontextlost", handleLost);
    };
  }, [gl, onContextLost]);

  return null;
}

export function ProductCanvas({
  productRef,
  onFirstFrame,
  onContextLost,
}: ProductCanvasProps) {
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
      <FirstFrameSignal onFirstFrame={onFirstFrame} />
      <ContextLossReporter onContextLost={onContextLost} />
    </Canvas>
  );
}