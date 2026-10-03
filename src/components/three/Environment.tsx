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
 * `environmentIntensity` is tuned down from the default so the case reads as
 * anodized aluminium rather than chrome. The HDRI is a bright studio box, and at
 * full intensity a metalness 0.85 surface mirrors it directly and blows out.
 *
 * `background` is left false, which is drei's default: the environment map is
 * used for reflections only and the scene keeps the flat near-black background
 * the canvas sets. The studio box is never visible behind the product.
 */

/** Local 1K CC0 studio HDRI. Verified against the Poly Haven published md5. */
const HDRI_FILE = "/textures/hdr/studio-softbox.hdr";

export function SceneEnvironment() {
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
      <Suspense fallback={null}>
        <Environment files={HDRI_FILE} environmentIntensity={0.55} background={false} />
      </Suspense>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />
      <directionalLight position={[-5, 2, -5]} intensity={0.35} />
    </>
  );
}