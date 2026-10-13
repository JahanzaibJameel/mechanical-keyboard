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

/**
 * Spring-physics parameters for critical damping.
 *
 * Critical damping = 2 * sqrt(k * m) ≈ 12.65 for k=40, m=1.
 * We use slightly underdamped (damping=12) to preserve a subtle overshoot
 * that makes the camera feel physical rather than obeying an exponential lerp.
 *
 * Item 2 — Spring-physics camera spec:
 *   stiffness = 40
 *   damping   = 12
 *   mass      = 1
 */
const SPRING_STIFFNESS = 40;
const SPRING_DAMPING = 12;
const SPRING_MASS = 1;
const SPRING_SETTLE_EPSILON = 0.001;

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

  // Spring-physics state refs
  const positionVelocity = useRef(new THREE.Vector3());
  const lookAtVelocity = useRef(new THREE.Vector3());
  const fovVelocity = useRef(0);
  const lookAtCurrent = useRef(new THREE.Vector3());

  // Core spring integration functions
  const springVector = (
    current: THREE.Vector3,
    target: THREE.Vector3,
    velocity: THREE.Vector3,
    delta: number,
  ): void => {
    const step = Math.min(delta, 0.05);

    const springForceX = (target.x - current.x) * SPRING_STIFFNESS;
    const springForceY = (target.y - current.y) * SPRING_STIFFNESS;
    const springForceZ = (target.z - current.z) * SPRING_STIFFNESS;

    const dampingForceX = -velocity.x * SPRING_DAMPING;
    const dampingForceY = -velocity.y * SPRING_DAMPING;
    const dampingForceZ = -velocity.z * SPRING_DAMPING;

    const accelX = (springForceX + dampingForceX) / SPRING_MASS;
    const accelY = (springForceY + dampingForceY) / SPRING_MASS;
    const accelZ = (springForceZ + dampingForceZ) / SPRING_MASS;

    velocity.x += accelX * step;
    velocity.y += accelY * step;
    velocity.z += accelZ * step;

    current.x += velocity.x * step;
    current.y += velocity.y * step;
    current.z += velocity.z * step;
  };

  const springScalar = (
    current: number,
    target: number,
    velocity: number,
    delta: number,
  ): number => {
    const step = Math.min(delta, 0.05);

    const springForce = (target - current) * SPRING_STIFFNESS;
    const dampingForce = -velocity * SPRING_DAMPING;
    const accel = (springForce + dampingForce) / SPRING_MASS;

    const nextVelocity = velocity + accel * step;
    const nextCurrent = current + nextVelocity * step;

    return nextCurrent;
  };

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
      lookAtCurrent.current.set(...initialState.target);
      camera.fov = initialState.fov;
      camera.updateProjectionMatrix();
      return;
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

    // Apply spring-physics for position, lookAt, and FOV
    springVector(camera.position, positionTarget.current, positionVelocity.current, delta);
    springVector(lookAtCurrent.current, lookAtTarget.current, lookAtVelocity.current, delta);
    const nextFov = springScalar(camera.fov, values.fov, fovVelocity.current, delta);
    if (nextFov !== camera.fov) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }

    // Settle snap: if both displacement and velocity are tiny, snap to target
    const posDeltaSq = camera.position.distanceToSquared(positionTarget.current);
    const lookDeltaSq = lookAtCurrent.current.distanceToSquared(lookAtTarget.current);
    const posSpeedSq = positionVelocity.current.lengthSq();
    const lookSpeedSq = lookAtVelocity.current.lengthSq();
    const fovDelta = Math.abs(camera.fov - values.fov);
    const fovSpeed = Math.abs(fovVelocity.current);

    if (
      posDeltaSq < SPRING_SETTLE_EPSILON * SPRING_SETTLE_EPSILON &&
      posSpeedSq < SPRING_SETTLE_EPSILON * SPRING_SETTLE_EPSILON &&
      lookDeltaSq < SPRING_SETTLE_EPSILON * SPRING_SETTLE_EPSILON &&
      lookSpeedSq < SPRING_SETTLE_EPSILON * SPRING_SETTLE_EPSILON &&
      fovDelta < 0.005 &&
      fovSpeed < 0.005
    ) {
      camera.position.copy(positionTarget.current);
      lookAtCurrent.current.copy(lookAtTarget.current);
      positionVelocity.current.set(0, 0, 0);
      lookAtVelocity.current.set(0, 0, 0);
      fovVelocity.current = 0;
      if (camera.fov !== values.fov) {
        camera.fov = values.fov;
        camera.updateProjectionMatrix();
      }
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
      forward.current.copy(lookAtCurrent.current).sub(camera.position);
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
    lookAtCurrent.current.x += drift.targetX;
    lookAtCurrent.current.y += drift.targetY;
    lookAtCurrent.current.z += drift.targetZ;

    camera.lookAt(lookAtCurrent.current);

    // Frames have to keep being requested while the lean or the drift is still
    // live, because the scroll owner has stopped emitting by then and would
    // otherwise freeze them part-way.
    const drifting =
      Math.max(Math.abs(drift.x), Math.abs(drift.y), Math.abs(drift.z)) >
      DRIFT_SETTLE_EPSILON;

    if (
      posDeltaSq > 0.000001 ||
      posSpeedSq > 0.000001 ||
      lookDeltaSq > 0.000001 ||
      lookSpeedSq > 0.000001 ||
      fovDelta > 0.01 ||
      fovSpeed > 0.01 ||
      lean.current !== 0 ||
      drifting
    ) {
      invalidate();
    }
  });

  return null;
}
