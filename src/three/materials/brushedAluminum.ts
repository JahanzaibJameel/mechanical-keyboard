import * as THREE from "three";

export type AnisoDir = "x" | "xz" | "none";

function dirToInt(dir: AnisoDir): number {
  switch (dir) {
    case "x": return 1;
    case "xz": return 2;
    default: return 0;
  }
}

export function applyBrushedAluminum(
  material: THREE.MeshStandardMaterial,
  options: { anisoDir: AnisoDir; intensity: number }
): void {
  const intensity = options.intensity;
  const dirInt = dirToInt(options.anisoDir);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAnisoIntensity = { value: intensity };
    shader.uniforms.uAnisoDir = { value: dirInt };

    shader.fragmentShader = shader.fragmentShader
.replace(
        "#include <common>",
        `#include <common>
        uniform float uAnisoIntensity;
        uniform int uAnisoDir;
        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }`
      )
      .replace(
        "#include <output_fragment>",
        `// Fresnel rim
        vec3 V = normalize(vViewPosition);
        vec3 N = normalize(vNormal);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        gl_FragColor.rgb += fres * 0.15;

        // Anisotropic streak (crude but visible)
        if (uAnisoDir == 1) {
          float a = hash(vViewPosition * 20.0);
          gl_FragColor.rgb += vec3(a) * uAnisoIntensity * 0.08;
        } else if (uAnisoDir == 2) {
          float a = hash(vViewPosition * vec3(20.0, 1.0, 20.0));
          gl_FragColor.rgb += vec3(a) * uAnisoIntensity * 0.06;
        }

        #include <output_fragment>`
      );
  };

  material.needsUpdate = true;
}
