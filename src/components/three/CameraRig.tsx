"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { cameraStateAtProgress } from "@/animation/transitions/cameraTransitions";
import { stepVelocityLean } from "@/animation/transitions/velocityLean";
import { cameraStates } from "@/data/cameraStates";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  experienceActiveSectionId,
  experienceProgressValue,
  experienceScrollVelocity,
} from "@/hooks/useExperienceProgress";
import type { CameraStateId } from "@/types/scene";

export type CameraRigProps = {
  readonly initialStateId?: CameraStateId;
};

export function CameraRig({
  initialStateId = "intro",
}: CameraRigProps) {
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const positionTarget = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const lean = useRef(0);
  const isPlacedRef = useRef(false);
  const initialState = cameraStates[initialStateId];

  // The camera is read from the frame state rather than from useThree. It is an
  // imperative object owned by the renderer, so it has to be mutated in place to
  // move the view; that is not a value this component produces, and treating it
  // as render output is what the previous useThree selector implied.
  useFrame((state, delta) => {
    const camera = state.camera;

    if (!(camera instanceof THREE.PerspectiveCamera)) {
      throw new Error("CameraRig requires a perspective camera.");
    }

    if (!isPlacedRef.current) {
      isPlacedRef.current = true;
      camera.position.set(...initialState.position);
      camera.lookAt(...initialState.target);
      camera.fov = initialState.fov;
      camera.updateProjectionMatrix();
    }

    const values = cameraStateAtProgress(
      experienceProgressValue.current,
      reducedMotion,
      experienceActiveSectionId.current,
    );

    positionTarget.current.set(...values.position);
    lookAtTarget.current.set(...values.target);

    if (reducedMotion) {
      lean.current = 0;
      camera.position.copy(positionTarget.current);
      camera.lookAt(lookAtTarget.current);
      if (camera.fov !== values.fov) {
        camera.fov = values.fov;
        camera.updateProjectionMatrix();
      }
      return;
    }

    const response = 1 - Math.exp(-delta * 2.5);

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
    }

    // Applied AFTER the settle snap above, so the snap cannot wipe it, and
    // BEFORE the lookAt below, so the offset shifts the view rather than being
    // overwritten by it.
    lean.current = stepVelocityLean({
      current: lean.current,
      velocity: experienceScrollVelocity.current,
      delta,
      reducedMotion,
    });

    if (lean.current !== 0) {
      forward.current.copy(lookAtTarget.current).sub(camera.position);
      if (forward.current.lengthSq() > 1e-12) {
        forward.current.normalize();
        camera.position.addScaledVector(forward.current, lean.current);
      }
    }

    camera.lookAt(lookAtTarget.current);

    // Frames have to keep being requested while the lean is still decaying,
    // because the scroll owner has stopped emitting by then and would otherwise
    // freeze the lean part-way home.
    if (distanceSq > 0.000001 || fovDelta > 0.01 || lean.current !== 0) {
      invalidate();
    }
  });

  return null;
}