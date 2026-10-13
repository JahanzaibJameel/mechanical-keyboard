"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { experienceProgressValue } from "@/hooks/useExperienceProgress";
import { resolveRenderTier } from "@/lib/renderTier";

const PARTICLE_COUNT_FULL = 8000;
const PARTICLE_COUNT_LITE = 400;

export function ParticleField() {
  const reduced = useReducedMotion();
  const tier = resolveRenderTier(typeof window === "undefined" ? 1200 : window.innerWidth);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const velocityRef = useRef(0);
  const lastProgress = useRef(0);

  const count = tier === "full" && !reduced ? PARTICLE_COUNT_FULL : PARTICLE_COUNT_LITE;

  const { positions, seeds, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
      positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
        }
        return { positions, seeds, sizes };
    }, [count]);
    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        g.index = quad.index;
        g.attributes.position = quad.attributes.position!;
        if (quad.attributes.uv) g.attributes.uv = quad.attributes.uv;
        g.setAttribute("aOffset", new THREE.InstancedBufferAttribute(positions, 3));
        g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
        g.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 1));
        g.instanceCount = count;
        return g;
    }, [positions, seeds, sizes, count]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uOpacity: { value: 0.15 },
    },
    vertexShader: `
      attribute vec3 aOffset;
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uVelocity;
      varying float vAlpha;
      void main() {
        float t = uTime * 0.3 + aSeed;
        vec3 p = aOffset;
        p.x += sin(t) * 0.8;
        p.y += cos(t * 0.8) * 0.6;
        p.z += sin(t * 0.6) * 0.7;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (aSize + uVelocity * 0.01) * 2000.0 / gl_Position.w;
        vAlpha = 0.8 + uVelocity * 0.4;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      uniform float uOpacity;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.1, d);
        vec3 col = vec3(1.0, 0.96, 0.88);
        gl_FragColor = vec4(col, a * uOpacity * vAlpha);
      }
    `,
  }), []);

  useFrame((state) => {
    (material.uniforms.uTime as any).value = state.clock.elapsedTime;
    const p = experienceProgressValue.current;
    const delta = Math.abs(p - lastProgress.current);
    velocityRef.current = velocityRef.current * 0.85 + delta * 0.15;
    lastProgress.current = p;
    (material.uniforms.uVelocity as any).value = Math.min(velocityRef.current * 4.0, 1.0);
  });

  if (tier === "lite" && reduced) return null;
  if (reduced) return null;

  return (<points geometry={geometry} material={material} frustumCulled={false} />);
}

