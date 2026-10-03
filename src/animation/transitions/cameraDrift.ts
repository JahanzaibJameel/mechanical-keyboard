/**
 * Idle camera drift.
 *
 * A very slow sinusoidal offset that fades in once the visitor has stopped
 * scrolling, so a parked camera is never perfectly frozen. Pure, so the
 * amplitude and fade can be asserted without a renderer.
 */

/** Peak offset applied to the camera position, in scene units. */
export const DRIFT_POSITION_AMPLITUDE = 0.02;

/** Peak offset applied to the look-at target, in scene units. */
export const DRIFT_TARGET_AMPLITUDE = 0.005;

/** Seconds for one full cycle. The brief allows 8 to 12; this is 10. */
export const DRIFT_PERIOD_S = 10;

/** Time without scroll input before the drift begins to appear. */
export const DRIFT_IDLE_DELAY_S = 2;

/** How long the drift takes to reach full amplitude once the delay has passed. */
export const DRIFT_FADE_S = 1.5;

/** Below this amplitude the drift is treated as absent and stops requesting frames. */
export const DRIFT_SETTLE_EPSILON = 0.00005;

export type CameraDrift = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetZ: number;
};

/** Fades in over DRIFT_FADE_S once idleTime exceeds DRIFT_IDLE_DELAY_S. */
export function driftEnvelope(idleTime: number): number {
  if (idleTime <= DRIFT_IDLE_DELAY_S) {
    return 0;
  }
  const fade = (idleTime - DRIFT_IDLE_DELAY_S) / DRIFT_FADE_S;
  return Math.min(1, fade);
}

/**
 * Offset for a given elapsed time and idle duration. Two incommensurate
 * frequencies across the three position axes so the motion never visibly loops.
 */
export function cameraDriftAt(elapsed: number, idleTime: number): CameraDrift {
  const envelope = driftEnvelope(idleTime);
  if (envelope <= 0) {
    return { x: 0, y: 0, z: 0, targetX: 0, targetY: 0, targetZ: 0 };
  }

  const base = (elapsed / DRIFT_PERIOD_S) * Math.PI * 2;
  const p = DRIFT_POSITION_AMPLITUDE * envelope;
  const t = DRIFT_TARGET_AMPLITUDE * envelope;

  return {
    x: Math.sin(base) * p,
    y: Math.sin(base * 0.63 + 1.1) * p * 0.8,
    z: Math.cos(base * 0.41 + 2.3) * p * 0.6,
    targetX: Math.sin(base * 0.37 + 0.7) * t,
    targetY: Math.cos(base * 0.53 + 1.9) * t * 0.8,
    targetZ: Math.sin(base * 0.29 + 2.6) * t * 0.6,
  };
}

/** Largest position component of a drift, used to decide whether to keep rendering. */
export function driftMagnitude(drift: CameraDrift): number {
  return Math.max(Math.abs(drift.x), Math.abs(drift.y), Math.abs(drift.z));
}