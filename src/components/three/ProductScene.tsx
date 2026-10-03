import { useContext } from "react";
import type { RefObject } from "react";
import type { ProductMotionTarget } from "@/animation/config";
import { ActiveSectionContext } from "@/components/layout/SiteShell";
import { CameraRig } from "@/components/three/CameraRig";
import { Environment } from "@/components/three/Environment";
import { ProductParts } from "@/components/three/ProductParts";
import {
  SceneEffects,
  shouldRenderDepthOfField,
  shouldRenderEffects,
} from "@/components/three/SceneEffects";
import { useReducedMotionState } from "@/hooks/useReducedMotion";
import type { ProductPartsHandle } from "@/types/parts";
import type { ProductConfig } from "@/types/product";

type ProductSceneProps = {
  readonly productRef: RefObject<ProductMotionTarget>;
  readonly partsRef: RefObject<ProductPartsHandle>;
  readonly config: ProductConfig;
  readonly isLiteTier: boolean;
};

export function ProductScene({
  productRef,
  partsRef,
  config,
  isLiteTier,
}: ProductSceneProps) {
  const { reducedMotion, resolved: motionResolved } = useReducedMotionState();
  const activeSectionId = useContext(ActiveSectionContext);

  // The composer is not mounted at all when it is unwanted, rather than mounted
  // with its effects switched off. That keeps its render targets and passes out
  // of the frame entirely on a phone or under reduced motion.
  //
  // Gated on `resolved` as well as on the value, because useReducedMotion starts
  // false by design so that hydration matches. Without the gate a reduced-motion
  // visitor would mount the whole chain once with reducedMotion still false,
  // compile every postprocessing shader for a frame they never keep, and then
  // unmount it. On this repository's software rasteriser that was enough to push
  // the first frame past the fallback watchdog.
  const effectsEnabled =
    motionResolved && shouldRenderEffects(reducedMotion, isLiteTier);

  return (
    <>
      <Environment />
      <CameraRig initialStateId="intro" />
      <ProductParts config={config} partsRef={partsRef} productRef={productRef} />
      {effectsEnabled ? (
        <SceneEffects depthOfField={shouldRenderDepthOfField(activeSectionId)} />
      ) : null}
    </>
  );
}