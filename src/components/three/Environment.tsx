import { Suspense } from "react";
import { Environment } from "@react-three/drei";

/**
 * Image-based lighting, plus three lights that shape it.
 *
 * Before this the scene had three bare lights and nothing for the metallic case
 * to reflect, so a surface with metalness 0.85 had no environment at all and read
 * as flat grey. Image-based lighting is what makes the case show a soft
 * highlight that shifts as the camera moves.
 *
 * The HDRI is a 1K CC0 studio softbox from Poly Haven, stored locally and loaded
 * with drei's useEnvironment via the files prop, so there is no network fetch at
 * runtime and no remote CDN dependency.
 *
 * It is dropped on a software renderer. Measured on this repository's software
 * rasteriser, adding the environment map took the desktop frame cost from about
 * 47ms to about 124ms, because every material then samples the map. A CPU
 * rasteriser cannot afford that, so Tier 3 falls back to the three-light rig the
 * scene used before image-based lighting existed. The environment is for a GPU.
 *
 * `background` is left false, drei's default, so the map is used for reflections
 * only and the scene keeps the flat near-black background the canvas sets. The
 * studio box is never visible behind the product.
 */

/** Local 1K CC0 studio HDRI. Verified against the Poly Haven published md5. */
const HDRI_FILE = "/textures/hdr/studio-softbox.hdr";

/**
 * How the scene is lit on a given renderer. One decision, both branches.
 */
export type SceneLighting = {
  /** Whether the HDRI is mounted at all. */
  readonly hdri: boolean;
  readonly ambientIntensity: number;
  readonly keyIntensity: number;
  readonly fillIntensity: number;
};

/**
 * With image-based lighting the HDRI supplies most of the ambient contribution,
 * so the lights only shape the key. Without it they have to carry the scene on
 * their own, which is why the software branch uses the higher original values.
 */
export function resolveSceneLighting(softwareRenderer: boolean): SceneLighting {
  if (softwareRenderer) {
    return {
      hdri: false,
      ambientIntensity: 0.6,
      keyIntensity: 1.2,
      fillIntensity: 0.4,
    };
  }

  return {
    hdri: true,
    ambientIntensity: 0.25,
    keyIntensity: 1.1,
    fillIntensity: 0.35,
  };
}

export function SceneEnvironment({
  softwareRenderer,
}: {
  readonly softwareRenderer: boolean;
}) {
  const lighting = resolveSceneLighting(softwareRenderer);

  return (
    <>
      {/*
        The environment map is wrapped in its own Suspense boundary and must stay
        inside it. useEnvironment throws a promise while the HDRI loads, and with
        no boundary above it that suspension propagated to the whole scene: the
        first frames were held until a 1.7MB asset had been fetched and decoded,
        which delayed the reveal pass and made the reduced-motion suite fail
        intermittently. With a local boundary only this subtree suspends, the
        three lights below are unaffected, and the scene renders immediately.
      */}
      {lighting.hdri ? (
        <Suspense fallback={null}>
          <Environment files={HDRI_FILE} environmentIntensity={0.55} background={false} />
        </Suspense>
      ) : null}
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight position={[5, 5, 5]} intensity={lighting.keyIntensity} />
      <directionalLight position={[-5, 2, -5]} intensity={lighting.fillIntensity} />
    </>
  );
}