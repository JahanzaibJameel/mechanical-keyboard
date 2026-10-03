/**
 * Velocity-coupled secondary motion.
 *
 * Scroll velocity pushes the camera a short way along its own view axis, so a
 * fast scroll leans into the move instead of arriving at it. The response is
 * deliberately asymmetric: a fast attack so the lean reads as a reaction to
 * input, and a slower release so it settles over about 400ms rather than
 * snapping back the instant the scroll ends.
 *
 * Pure, so it can be unit tested without a renderer. The camera applies the
 * result as a displacement along its forward vector.
 */

/** Maximum secondary offset, in scene units. */
export const LEAN_LIMIT = 0.15;

/** Scroll velocity, in progress units per second, that maps to the limit. */
export const LEAN_GAIN = 0.25;

/** Response rate while the lean is growing. */
export const LEAN_ATTACK_RATE = 18;

/** Response rate while the lean is returning to zero. */
export const LEAN_RELEASE_RATE = 7.5;

/** Below this the lean is treated as settled and stops requesting frames. */
export const LEAN_SETTLE_EPSILON = 0.0002;

export type VelocityLeanOptions = {
  /** Current lean, in scene units. */
  readonly current: number;
  /** Scroll velocity in progress units per second. */
  readonly velocity: number;
  /** Frame delta in seconds. */
  readonly delta: number;
  /** Suppresses the effect entirely. */
  readonly reducedMotion: boolean;
};

/**
 * Advances the lean by one frame. Always returns a value within +/-LEAN_LIMIT,
 * and exactly 0 when reduced motion is requested.
 */
export function stepVelocityLean({
  current,
  velocity,
  delta,
  reducedMotion,
}: VelocityLeanOptions): number {
  if (reducedMotion) {
    return 0;
  }

  const desired = Math.max(-LEAN_LIMIT, Math.min(LEAN_LIMIT, velocity * LEAN_GAIN));
  const rate = Math.abs(desired) > Math.abs(current) ? LEAN_ATTACK_RATE : LEAN_RELEASE_RATE;
  const next = current + (desired - current) * (1 - Math.exp(-delta * rate));

  return Math.abs(next) < LEAN_SETTLE_EPSILON ? 0 : next;
}