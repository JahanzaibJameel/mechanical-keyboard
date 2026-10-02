"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { cameraStateAtProgress } from "@/animation/transitions/cameraTransitions";
import { cameraStates } from "@/data/cameraStates";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  experienceActiveSectionId,
  experienceProgressValue,
} from "@/hooks/useExperienceProgress";
import type { CameraStateId } from "@/types/scene";

export type CameraRigProps = {
  readonly initialStateId?: CameraStateId;
};

export function CameraRig({
  initialStateId = "intro",
}: CameraRigProps) {
  const reducedMotion = useReducedMotion();
  const camera = useThree((state) => {
    if (!(state.camera instanceof THREE.PerspectiveCamera)) {
      throw new Error("CameraRig requires a perspective camera.");
    }
    return state.camera;
  });
  const invalidate = useThree((state) => state.invalidate);
  const positionTarget = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3());
  const initialState = cameraStates[initialStateId];

  useLayoutEffect(() => {
    camera.position.set(...initialState.position);
    camera.lookAt(...initialState.target);
    camera.fov = initialState.fov;
    camera.updateProjectionMatrix();
  }, [camera, initialState]);

  useFrame((_, delta) => {
    const values = cameraStateAtProgress(
      experienceProgressValue.current,
      reducedMotion,
      experienceActiveSectionId.current,
    );

    if (reducedMotion) {
      camera.position.set(...values.position);
      camera.lookAt(...values.target);
      if (camera.fov !== values.fov) {
        camera.fov = values.fov;
        camera.updateProjectionMatrix();
      }
      return;
    }

    const response = 1 - Math.exp(-delta * 2.5);

    positionTarget.current.set(...values.position);
    lookAtTarget.current.set(...values.target);
    camera.position.lerp(positionTarget.current, response);
    camera.lookAt(lookAtTarget.current);

    const nextFov = THREE.MathUtils.damp(camera.fov, values.fov, 4, delta);
    if (camera.fov !== nextFov) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }

    const distanceSq = camera.position.distanceToSquared(positionTarget.current);
    const fovDelta = Math.abs(camera.fov - values.fov);

    if (distanceSq < 1e-8 && fovDelta < 0.005) {
      camera.position.copy(positionTarget.current);
      camera.fov = values.fov;
      camera.updateProjectionMatrix();
    } else if (distanceSq > 0.000001 || fovDelta > 0.01) {
      invalidate();
    }
  });

  return null;
}
