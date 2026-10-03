"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  DRIFT_SETTLE_EPSILON,
  cameraDriftAt,
  driftEnvelope,
} from "@/animation/transitions/cameraDrift";
import { cameraStateAtProgress } from "@/animation/transitions/cameraTransitions";
import { stepVelocityLean } from "@/animation/transitions/velocityLean";
import { cameraStates } from "@/data/cameraStates";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  experienceActiveSectionId,
  experienceLastScrollAt,
  experienceProgressValue,
  experienceScrollVelocity,
} from "@/hooks/useExperienceProgress";
import type { CameraStateId } from "@/types/scene";

export type CameraRigProps = {
  readonly initialStateId?: CameraStateId;
};

/**
 * How often the idle loop asks for a frame while the drift is running.
 *
 * 10Hz is deliberate. The drift is a 10 second cycle, so this is still 100
 * samples per cycle and the motion is indistinguishable from 60Hz. It matters
 * because the idle loop is what keeps the renderer awake, and with a
 * postprocessing chain mounted each of those frames costs several full-screen
 * passes. Requesting them at 30Hz would spend three times the battery for a
 * difference nobody can see on a 0.02 unit offset.
 */
const IDLE_FRAME_INTERVAL_MS = 100;

export function CameraRig({
  initialStateId = "intro",
}: CameraRigProps) {
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const positionTarget = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const lean = useRef(0);
  const elapsed = useRef(0);
  const isPlacedRef = useRef(false);
  const initialState = cameraStates[initialStateId];

  /**
   * Keeps the renderer awake while the idle drift is running.
   *
   * The canvas is on frameloop="demand", so nothing would be drawn at all if the
   * drift were left to ride on scroll frames. That is what previously made the
   * camera bit-exact frozen whenever the visitor stopped. This loop only runs
   * once the drift envelope is actually open, and is torn down on unmount and
   * skipped entirely under reduced motion.
   */
  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let handle = 0;
    let lastTick = 0;

    const tick = (now: number): void => {
      const idleTime = (now - experienceLastScrollAt.current) / 1000;
      if (driftEnvelope(idleTime) > 0) {
        invalidate();
      }
      if (now - lastTick >= IDLE_FRAME_INTERVAL_MS) {
        lastTick = now;
      }
      handle = window.requestAnimationFrame(tick);
    };

    handle = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(handle);
  }, [invalidate, reducedMotion]);

  // The camera is read from the frame state rather than from useThree. It is an
  // imperative object owned by the renderer, so it has to be mutated in place to
  // move the view; that is not a value this component produces, and treating it
  // as render output is what the previous useThree selector implied.
  useFrame((state, delta) => {
    const camera = state.camera;
    elapsed.current += delta;

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

    /**
     * Idle drift, applied to both the position and the look-at target.
     *
     * MUST come before the lookAt call below. lookAt orients the camera using the
     * position it is given, so drifting the position first and then orienting is
     * what makes the drift visible; orienting first and then moving would leave
     * the target orientation stale and the drift would read as the camera
     * sliding without turning.
     */
    const idleTime = (performance.now() - experienceLastScrollAt.current) / 1000;
    const drift = cameraDriftAt(elapsed.current, idleTime);
    camera.position.x += drift.x;
    camera.position.y += drift.y;
    camera.position.z += drift.z;
    lookAtTarget.current.x += drift.targetX;
    lookAtTarget.current.y += drift.targetY;
    lookAtTarget.current.z += drift.targetZ;

    camera.lookAt(lookAtTarget.current);

    // Frames have to keep being requested while the lean or the drift is still
    // live, because the scroll owner has stopped emitting by then and would
    // otherwise freeze them part-way.
    const drifting =
      Math.max(Math.abs(drift.x), Math.abs(drift.y), Math.abs(drift.z)) >
      DRIFT_SETTLE_EPSILON;

    if (distanceSq > 0.000001 || fovDelta > 0.01 || lean.current !== 0 || drifting) {
      invalidate();
    }
  });

  return null;
}