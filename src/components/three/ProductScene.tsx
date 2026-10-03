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
  useSoftwareRenderer,
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
  const softwareRenderer = useSoftwareRenderer();

  // The composer is not mounted at all when it is unwanted, rather than mounted
  // with its effects switched off. That keeps its render targets and passes out
  // of the frame entirely on a phone, under reduced motion, or on a CPU
  // rasteriser.
  //
  // Gated on `resolved` as well as on the value, because useReducedMotion starts
  // false by design so that hydration matches. Without the gate a reduced-motion
  // visitor would mount the whole chain once with reducedMotion still false,
  // compile every postprocessing shader for a frame they never keep, and then
  // unmount it. On a software rasteriser that was enough to push the first frame
  // past the fallback watchdog.
  //
  // A software renderer drops the composer entirely rather than dropping only
  // depth of field, because measured against this repository's software
  // rasteriser nothing in the chain comes near a 10ms budget: the composer alone
  // costs about 25ms, chromatic aberration and vignette together about 156ms,
  // bloom about 153ms and depth of field about 828ms.
  const effectsEnabled =
    motionResolved && !softwareRenderer && shouldRenderEffects(reducedMotion, isLiteTier);

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