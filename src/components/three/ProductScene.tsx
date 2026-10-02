import type { RefObject } from "react";
import type { ProductMotionTarget } from "@/animation/config";
import { CameraRig } from "@/components/three/CameraRig";
import { Environment } from "@/components/three/Environment";
import { ProductParts } from "@/components/three/ProductParts";
import type { ProductPartsHandle } from "@/types/parts";
import type { ProductConfig } from "@/types/product";

type ProductSceneProps = {
  readonly productRef: RefObject<ProductMotionTarget>;
  readonly partsRef: RefObject<ProductPartsHandle>;
  readonly config: ProductConfig;
};

export function ProductScene({ productRef, partsRef, config }: ProductSceneProps) {
  return (
    <>
      <Environment />
      <CameraRig initialStateId="intro" />
      <ProductParts config={config} partsRef={partsRef} productRef={productRef} />
    </>
  );
}
