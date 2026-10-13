"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  readonly duration?: number;
  readonly maxDisplacement?: number;
};

/**
 * Applies a slow Perlin-like drift to the camera.
 * This is not shake — it is the small, continuous movement of a hand
 * holding a camera. It makes the scene feel alive when idle.
 */
export function HandheldShake({ duration = 0.3, maxDisplacement = 15 }: Props) {
  const reduced = useReducedMotion();
  const { camera } = useThree();
  const basePosition = useRef<THREE.Vector3 | null>(null);
  const seed = useRef(Math.random() * 1000);

  useFrame((state) => {
    if (reduced) return;

    if (!basePosition.current) {
      basePosition.current = camera.position.clone();
    }

    const t = state.clock.elapsedTime * duration;
    const s = seed.current;

    const amp = maxDisplacement * 0.0005;
    const x = Math.sin(t * 0.9 + s) * Math.cos(t * 0.3 + s * 0.7) * amp;
    const y = Math.sin(t * 0.7 + s * 1.3) * amp * 0.8;
    const z = Math.cos(t * 0.5 + s * 2.1) * amp * 0.6;

    camera.position.x += (basePosition.current.x + x - camera.position.x) * 0.1;
    camera.position.y += (basePosition.current.y + y - camera.position.y) * 0.1;
    camera.position.z += (basePosition.current.z + z - camera.position.z) * 0.1;
  });

  return null;
}