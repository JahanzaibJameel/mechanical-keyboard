"use client";

import * as THREE from "three";
import type { Mesh, MeshStandardMaterial, Vector2, Vector3, Euler } from "three";

export interface KeycapState {
  readonly id: number;
  readonly basePosition: Vector3;
  readonly baseRotation: Euler;
  readonly baseScale: Vector3;
  currentPosition: Vector3;
  currentRotation: Euler;
  currentScale: Vector3;
  velocity: Vector3;
  proximity: number;
  ripplePhase: number;
  morphProgress: number;
  isAnimating: boolean;
}

export interface KeycapMotionConfig {
  readonly keycapCount: number;
  readonly proximityRadius: number;
  readonly proximityStrength: number;
  readonly rippleDuration: number;
  readonly morphDuration: number;
  readonly maxProximityLift: number;
  readonly maxProximityTilt: number;
  readonly springStiffness: number;
  readonly springDamping: number;
}

export const DEFAULT_CONFIG: KeycapMotionConfig = {
  keycapCount: 75,
  proximityRadius: 0.08,
  proximityStrength: 0.45,
  rippleDuration: 350,
  morphDuration: 4000,
  maxProximityLift: 0.006,
  maxProximityTilt: 0.08,
  springStiffness: 180,
  springDamping: 22,
};

interface RippleRing {
  center: Vector2;
  startTime: number;
  duration: number;
}

const rippleRings: RippleRing[] = [];
const keycapStates = new Map<number, KeycapState>();
let config = DEFAULT_CONFIG;
let cursorNDC: Vector2 | null = null;
let morphTime = 0;
let isMorphActive = false;
let reducedMotion = false;
let materialPatcher: ((material: MeshStandardMaterial, keycapId: number, state: KeycapState) => void) | null = null;
let invalidate: (() => void) | null = null;

function createInitialState(id: number, position: Vector3, rotation: Euler, scale: Vector3): KeycapState {
  return {
    id,
    basePosition: position.clone(),
    baseRotation: rotation.clone(),
    baseScale: scale.clone(),
    currentPosition: position.clone(),
    currentRotation: rotation.clone(),
    currentScale: scale.clone(),
    velocity: new THREE.Vector3(),
    proximity: 0,
    ripplePhase: 0,
    morphProgress: 0,
    isAnimating: false,
  };
}

export function initKeycapMotion(
  keycaps: ReadonlyArray<{ id: number; position: Vector3; rotation: Euler; scale: Vector3 }>,
  userConfig: Partial<KeycapMotionConfig>,
  options: {
    readonly reducedMotion: boolean;
    readonly onInvalidate: () => void;
    readonly patchMaterial: (material: MeshStandardMaterial, keycapId: number, state: KeycapState) => void;
  }
): void {
  config = { ...DEFAULT_CONFIG, ...userConfig };
  reducedMotion = options.reducedMotion;
  invalidate = options.onInvalidate;
  materialPatcher = options.patchMaterial;

  keycapStates.clear();
  rippleRings.length = 0;
  morphTime = 0;
  isMorphActive = false;
  cursorNDC = null;

  for (const kc of keycaps) {
    keycapStates.set(kc.id, createInitialState(kc.id, kc.position, kc.rotation, kc.scale));
  }
}

export function setReducedMotion(value: boolean): void {
  reducedMotion = value;
}

export function setCursorNDC(ndc: Vector2 | null): void {
  cursorNDC = ndc;
}

export function triggerHeroRipple(centerNDC: Vector2): void {
  if (reducedMotion) return;
  rippleRings.push({
    center: centerNDC.clone(),
    startTime: performance.now(),
    duration: config.rippleDuration,
  });
  if (invalidate) invalidate();
}

export function startFinaleMorph(): void {
  if (reducedMotion) return;
  isMorphActive = true;
  morphTime = 0;
  if (invalidate) invalidate();
}

export function stopFinaleMorph(): void {
  isMorphActive = false;
}

function worldToNDC(position: Vector3, camera: THREE.Camera): Vector2 {
  const projected = position.clone().project(camera);
  return new THREE.Vector2(projected.x, projected.y);
}

function getProximityFactor(keycapNDC: Vector2, cursor: Vector2): number {
  const dx = keycapNDC.x - cursor.x;
  const dy = keycapNDC.y - cursor.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = config.proximityRadius;
  if (dist >= radius) return 0;
  const t = 1 - dist / radius;
  return t * t * (3 - 2 * t) * config.proximityStrength;
}

function updateRipple(keycapNDC: Vector2, state: KeycapState, now: number): number {
  let maxPhase = 0;
  for (const ring of rippleRings) {
    const elapsed = now - ring.startTime;
    if (elapsed > ring.duration) continue;
    const dx = keycapNDC.x - ring.center.x;
    const dy = keycapNDC.y - ring.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const waveSpeed = 0.8;
    const wavePos = (elapsed / ring.duration) * waveSpeed;
    const waveWidth = 0.15;
    const influence = Math.max(0, 1 - Math.abs(dist - wavePos) / waveWidth);
    maxPhase = Math.max(maxPhase, influence * Math.sin(elapsed * 0.02) * 0.004);
  }
  return maxPhase;
}

function updateMorph(state: KeycapState, delta: number): number {
  if (!isMorphActive) return 0;
  morphTime += delta * 1000;
  const progress = Math.min(morphTime / config.morphDuration, 1);
  const freq = 0.5;
  const amplitude = 0.003;
  return Math.sin(progress * Math.PI * 2 * freq) * amplitude * (1 - progress * 0.5);
}

function springStep(
  current: Vector3,
  target: Vector3,
  velocity: Vector3,
  stiffness: number,
  damping: number,
  delta: number
): void {
  const force = new THREE.Vector3().subVectors(target, current).multiplyScalar(stiffness);
  const damp = velocity.clone().multiplyScalar(-damping);
  const accel = force.add(damp);
  velocity.addScaledVector(accel, delta);
  current.addScaledVector(velocity, delta);
}

export function updateKeycapMotion(
  camera: THREE.Camera,
  delta: number
): void {
  if (reducedMotion) {
    for (const state of keycapStates.values()) {
      state.currentPosition.copy(state.basePosition);
      state.currentRotation.copy(state.baseRotation);
      state.currentScale.copy(state.baseScale);
      state.velocity.set(0, 0, 0);
      state.proximity = 0;
      state.ripplePhase = 0;
      state.morphProgress = 0;
    }
    rippleRings.length = 0;
    return;
  }

  const now = performance.now();

  for (const state of keycapStates.values()) {
    const keycapNDC = worldToNDC(state.basePosition, camera);

    let proximityFactor = 0;
    if (cursorNDC) {
      proximityFactor = getProximityFactor(keycapNDC, cursorNDC);
    }
    state.proximity = THREE.MathUtils.lerp(state.proximity, proximityFactor, 1 - Math.exp(-delta * 15));

    const ripplePhase = updateRipple(keycapNDC, state, now);
    state.ripplePhase = THREE.MathUtils.lerp(state.ripplePhase, ripplePhase, 1 - Math.exp(-delta * 20));

    const morphOffset = updateMorph(state, delta);
    state.morphProgress = morphOffset;

    const targetPosition = state.basePosition.clone();
    targetPosition.y += state.proximity * config.maxProximityLift;
    targetPosition.y += state.ripplePhase;
    targetPosition.y += state.morphProgress;

    const targetRotation = state.baseRotation.clone();
    if (cursorNDC) {
      const dx = keycapNDC.x - cursorNDC.x;
      const dy = keycapNDC.y - cursorNDC.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < config.proximityRadius) {
        const strength = (1 - dist / config.proximityRadius) * config.maxProximityTilt;
        targetRotation.x -= dy * strength;
        targetRotation.z += dx * strength;
      }
    }
    targetRotation.x += state.morphProgress * 0.5;
    targetRotation.z += state.morphProgress * 0.3;

    const targetScale = state.baseScale.clone();
    targetScale.multiplyScalar(1 + state.proximity * 0.02 + Math.abs(state.ripplePhase) * 0.1);

    springStep(state.currentPosition, targetPosition, state.velocity, config.springStiffness, config.springDamping, delta);

    const rotVel = new THREE.Vector3();
    springStep(
      new THREE.Vector3(state.currentRotation.x, state.currentRotation.y, state.currentRotation.z),
      new THREE.Vector3(targetRotation.x, targetRotation.y, targetRotation.z),
      rotVel,
      config.springStiffness * 0.5,
      config.springDamping * 1.5,
      delta
    );
    state.currentRotation.set(rotVel.x, rotVel.y, rotVel.z);

    springStep(state.currentScale, targetScale, new THREE.Vector3(), config.springStiffness * 2, config.springDamping * 2, delta);

    if (materialPatcher) {
      const mesh = new THREE.Mesh();
      mesh.material = new THREE.MeshStandardMaterial();
      materialPatcher(mesh.material as MeshStandardMaterial, state.id, state);
    }
  }

  for (let i = rippleRings.length - 1; i >= 0; i--) {
    const ring = rippleRings[i];
    if (ring && now - ring.startTime > ring.duration) {
      rippleRings.splice(i, 1);
    }
  }
}

export function applyKeycapTransform(mesh: Mesh, keycapId: number): void {
  const state = keycapStates.get(keycapId);
  if (!state) return;

  mesh.position.copy(state.currentPosition);
  mesh.rotation.copy(state.currentRotation);
  mesh.scale.copy(state.currentScale);
}

export function getKeycapState(keycapId: number): KeycapState | undefined {
  return keycapStates.get(keycapId);
}

export function getAllKeycapStates(): ReadonlyMap<number, KeycapState> {
  return keycapStates;
}

export function setConfig(newConfig: Partial<KeycapMotionConfig>): void {
  config = { ...config, ...newConfig };
}

export function getConfig(): KeycapMotionConfig {
  return { ...config };
}