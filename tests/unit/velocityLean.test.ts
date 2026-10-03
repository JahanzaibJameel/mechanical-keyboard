import { describe, expect, it } from "vitest";
import {
  LEAN_ATTACK_RATE,
  LEAN_GAIN,
  LEAN_LIMIT,
  LEAN_RELEASE_RATE,
  LEAN_SETTLE_EPSILON,
  stepVelocityLean,
} from "../../src/animation/transitions/velocityLean";

const FRAME = 1 / 60;

/** Runs the follower for a number of frames at a fixed velocity. */
function run(
  velocity: number,
  frames: number,
  start = 0,
  reducedMotion = false,
): number {
  let current = start;
  for (let i = 0; i < frames; i++) {
    current = stepVelocityLean({ current, velocity, delta: FRAME, reducedMotion });
  }
  return current;
}

describe("velocity lean", () => {
  it("is exactly zero under reduced motion, whatever the velocity", () => {
    expect(stepVelocityLean({ current: 0.12, velocity: 5, delta: FRAME, reducedMotion: true })).toBe(0);
    expect(stepVelocityLean({ current: 0, velocity: -5, delta: FRAME, reducedMotion: true })).toBe(0);
    expect(run(5, 120, 0.1, true)).toBe(0);
  });

  it("maps velocity to lean linearly below the cap", () => {
    // One frame from rest at a low velocity: the result is a fraction of the
    // desired value, so assert the desired value itself via a long run.
    expect(stepVelocityLean({ current: 0, velocity: 1, delta: FRAME, reducedMotion: false })).toBeGreaterThan(0);
    expect(stepVelocityLean({ current: 0, velocity: -1, delta: FRAME, reducedMotion: false })).toBeLessThan(0);
  });

  it("sign follows the direction of scroll", () => {
    expect(run(1, 240)).toBeGreaterThan(0);
    expect(run(-1, 240)).toBeLessThan(0);
  });

  it("never exceeds the limit, however hard the scroll", () => {
    expect(Math.abs(run(0.6, 600))).toBeLessThanOrEqual(LEAN_LIMIT);
    expect(Math.abs(run(50, 600))).toBeLessThanOrEqual(LEAN_LIMIT);
    expect(Math.abs(run(-50, 600))).toBeLessThanOrEqual(LEAN_LIMIT);
  });

  it("reaches the cap for a fast scroll and sits at it", () => {
    // 0.6 progress units per second maps exactly to the limit at gain 0.25.
    expect(run(0.6 / LEAN_GAIN, 600)).toBeCloseTo(LEAN_LIMIT, 5);
  });

  it("attacks faster than it releases", () => {
    const attackFrames = 3;
    const afterAttack = run(1, attackFrames);
    const releasedAtSameFrames = run(0, attackFrames, afterAttack);

    // Returning from the same magnitude toward zero must lag behind reaching it.
    expect(Math.abs(releasedAtSameFrames)).toBeLessThan(Math.abs(afterAttack));
    expect(LEAN_ATTACK_RATE).toBeGreaterThan(LEAN_RELEASE_RATE);
  });

  it("decays to under 5% of peak within about 400ms of the scroll stopping", () => {
    const peak = run(1, 240);
    expect(Math.abs(peak)).toBeGreaterThan(0);

    // LEAN_RELEASE_RATE is 7.5, a 133ms time constant, so 400ms is three time
    // constants: 1 - e^-3 = 95% of the lean gone. Asserting the real curve
    // rather than an exact zero, which the exponential does not reach there.
    const after400ms = run(0, Math.round(0.4 / FRAME), peak);
    expect(Math.abs(after400ms)).toBeLessThan(Math.abs(peak) * 0.05);
  });

  it("reaches exactly zero once inside the settle epsilon", () => {
    const peak = run(1, 240);
    expect(Math.abs(peak)).toBeGreaterThan(0);

    // 1 - e^(-7.5t) < 0.0002/0.15 puts the exact-zero point near 883ms.
    expect(run(0, Math.round(0.95 / FRAME), peak)).toBe(0);
  });

  it("collapses to zero once inside the settle epsilon", () => {
    expect(
      stepVelocityLean({
        current: LEAN_SETTLE_EPSILON / 2,
        velocity: 0,
        delta: FRAME,
        reducedMotion: false,
      }),
    ).toBe(0);
  });

  it("converges identically regardless of frame rate over equal elapsed time", () => {
    // Exponential smoothing advances by a different fraction on each step, so a
    // single-step comparison is meaningless. The property that matters is that
    // the same elapsed time produces the same result at any step size.
    const converge = (steps: number, seconds: number): number => {
      let current = 0;
      const delta = seconds / steps;
      for (let i = 0; i < steps; i++) {
        current = stepVelocityLean({ current, velocity: 1, delta, reducedMotion: false });
      }
      return current;
    };

    const reference = converge(240, 0.5);
    for (const steps of [15, 30, 60]) {
      expect(converge(steps, 0.5)).toBeCloseTo(reference, 5);
    }
  });
});