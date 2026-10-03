"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { ProductMotionTarget } from "@/animation/config";
import { ProductScene } from "@/components/three/ProductScene";
import { cameraStates } from "@/data/cameraStates";
import { useProductConfig } from "@/hooks/useProductConfig";
import { BRAND_BACKGROUND, CANVAS_DPR, MOBILE_LITE_PIXEL_RATIO } from "@/lib/constants";
import { LITE_TIER_MEDIA_QUERY, resolveRenderTier, type RenderTier } from "@/lib/renderTier";
import { sceneContextLost, sceneHasRenderedFrame } from "@/lib/sceneHealth";
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
    sceneHasRenderedFrame.current = true;
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
      sceneContextLost.current = true;
      onContextLost?.();
    };

    element.addEventListener("webglcontextlost", handleLost, false);

    // Also poll the context itself, because some drivers report a lost context
    // without dispatching the event, and because this is what tells the watchdog
    // that a scene which has simply not drawn yet is still healthy.
    const stopPolling = sceneHealthPoll(gl, () => {
      if (!gl.getContext()?.isContextLost()) {
        sceneContextLost.current = false;
      }
    });

    return () => {
      element.removeEventListener("webglcontextlost", handleLost);
      stopPolling();
    };
  }, [gl, onContextLost]);

  return null;
}

/** Polls context health on a slow interval; cleared on unmount. */
function sceneHealthPoll(
  gl: { domElement: HTMLCanvasElement },
  onTick: () => void,
): () => void {
  const handle = window.setInterval(onTick, 500);
  return () => window.clearInterval(handle);
}

/**
 * Resolves the render tier, or null until it is known.
 *
 * The null state matters: R3F builds the WebGLRenderer once and does not
 * re-apply the `gl` options afterwards, so antialiasing has to be known before
 * the Canvas mounts. Returning null until the media query has answered
 * guarantees the renderer is constructed correctly the first time. It costs one
 * frame in a subtree that is already lazy and only mounts after user intent.
 */
function useRenderTier(): RenderTier | null {
  const [tier, setTier] = useState<RenderTier | null>(null);

  useEffect(() => {
    const query = window.matchMedia(LITE_TIER_MEDIA_QUERY);

    const updateTier = (): void => setTier(resolveRenderTier(window.innerWidth));

    updateTier();
    query.addEventListener("change", updateTier);
    window.addEventListener("resize", updateTier);

    return () => {
      query.removeEventListener("change", updateTier);
      window.removeEventListener("resize", updateTier);
    };
  }, []);

  return tier;
}

export function ProductCanvas({
  productRef,
  onFirstFrame,
  onContextLost,
}: ProductCanvasProps) {
  const partsRef = useRef<ProductPartsHandle>({ ...emptyProductParts });
  const { config } = useProductConfig();
  const tier = useRenderTier();

  if (tier === null) {
    return null;
  }

  const isLite = tier === "lite";

  return (
    <Canvas
      dpr={isLite ? MOBILE_LITE_PIXEL_RATIO : CANVAS_DPR}
      frameloop="demand"
      gl={{ antialias: !isLite }}
      camera={{
        position: cameraStates.intro.position,
        fov: cameraStates.intro.fov,
        near: 0.1,
        far: 100,
      }}
      style={{ background: BRAND_BACKGROUND, width: "100%", height: "100%" }}
    >
      <ProductScene
        config={config}
        partsRef={partsRef}
        productRef={productRef}
        isLiteTier={isLite}
      />
      <FirstFrameSignal onFirstFrame={onFirstFrame} />
      <ContextLossReporter onContextLost={onContextLost} />
    </Canvas>
  );
}