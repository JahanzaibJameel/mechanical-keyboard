"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vector3 } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface VelocityPostprocessingParams {
  readonly chromaticAberrationOffset: number;
  readonly depthOfFieldBokehScale: number;
  readonly vignetteDarkness: number;
}

const BASE_CA = 0.0008;
const BASE_BOKEH = 2.5;
const BASE_VIGNETTE = 0.55;

const MAX_CA = 0.003;
const MAX_BOKEH = 6;
const MAX_VIGNETTE = 0.8;

const RELAXATION_HALF_LIFE = 0.15;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function useVelocityDrivenPostprocessing(): VelocityPostprocessingParams {
  const reducedMotion = useReducedMotion();
  const camera = useThree((state) => state.camera);
  const prevPositionRef = useRef<Vector3>(new Vector3());
  const prevRotationRef = useRef<THREE.Euler>(new THREE.Euler());
  const velocityRef = useRef(0);
  const initializedRef = useRef(false);

  const [params, setParams] = useState<VelocityPostprocessingParams>(() => ({
    chromaticAberrationOffset: BASE_CA,
    depthOfFieldBokehScale: BASE_BOKEH,
    vignetteDarkness: BASE_VIGNETTE,
  }));

  useFrame((_, delta) => {
    if (reducedMotion) {
      const newParams = {
        chromaticAberrationOffset: BASE_CA,
        depthOfFieldBokehScale: BASE_BOKEH,
        vignetteDarkness: BASE_VIGNETTE,
      };
      setParams(newParams);
      return;
    }

    if (!initializedRef.current) {
      prevPositionRef.current.copy(camera.position);
      prevRotationRef.current.copy(camera.rotation);
      initializedRef.current = true;
      return;
    }

    const posDelta = camera.position.distanceTo(prevPositionRef.current);
    const rotDelta = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromEuler(camera.rotation)
        .multiply(new THREE.Quaternion().setFromEuler(prevRotationRef.current).invert())
    ).x; // use x as a proxy for rotation change magnitude
    const currentVelocity = posDelta + Math.abs(rotDelta) * 0.5;

    const alpha = 1 - Math.exp(-Math.log(2) / RELAXATION_HALF_LIFE * delta);
    velocityRef.current = lerp(velocityRef.current, currentVelocity, alpha);

    const normalizedVelocity = Math.min(velocityRef.current / 0.5, 1);

    const newParams = {
      chromaticAberrationOffset: lerp(BASE_CA, MAX_CA, normalizedVelocity),
      depthOfFieldBokehScale: lerp(BASE_BOKEH, MAX_BOKEH, normalizedVelocity),
      vignetteDarkness: lerp(BASE_VIGNETTE, MAX_VIGNETTE, normalizedVelocity),
    };
    setParams(newParams);

    prevPositionRef.current.copy(camera.position);
    prevRotationRef.current.copy(camera.rotation);
  });

  return params;
}