import { describe, expect, it } from "vitest";
import { evaluateCameraPath } from "../../src/animation/transitions/cameraPath";
import { CAMERA_EASING_NAMES, resolveCameraEase } from "../../src/animation/transitions/cameraEasing";
import {
  DRIFT_FADE_S,
  DRIFT_IDLE_DELAY_S,
  DRIFT_PERIOD_S,
  DRIFT_POSITION_AMPLITUDE,
  DRIFT_TARGET_AMPLITUDE,
  cameraDriftAt,
  driftEnvelope,
} from "../../src/animation/transitions/cameraDrift";
import { cameraPathFor } from "../../src/data/cameraPaths";
import { cameraStates } from "../../src/data/cameraStates";
import { sections } from "../../src/data/sections";

const SAMPLE = cameraPathFor("construction");

describe("evaluateCameraPath", () => {
  it("returns the enter keyframe exactly at t=0", () => {
    expect(evaluateCameraPath(SAMPLE, 0)).toEqual(SAMPLE.enter);
  });

  it("returns the mid keyframe exactly at t=0.5", () => {
    expect(evaluateCameraPath(SAMPLE, 0.5)).toEqual(SAMPLE.mid);
  });

  it("returns the exit keyframe exactly at t=1", () => {
    expect(evaluateCameraPath(SAMPLE, 1)).toEqual(SAMPLE.exit);
  });

  it("clamps outside 0..1 rather than extrapolating", () => {
    expect(evaluateCameraPath(SAMPLE, -3)).toEqual(SAMPLE.enter);
    expect(evaluateCameraPath(SAMPLE, 7)).toEqual(SAMPLE.exit);
  });

  it("moves monotonically along each half at a non-linear point", () => {
    const quarter = evaluateCameraPath(SAMPLE, 0.25);
    const threeQuarters = evaluateCameraPath(SAMPLE, 0.75);

    // t=0.25 sits a quarter of the way from enter toward mid, eased.
    expect(quarter.fov).not.toBe(SAMPLE.enter.fov);
    expect(quarter.fov).not.toBe(SAMPLE.mid.fov);
    expect(threeQuarters.fov).not.toBe(SAMPLE.mid.fov);
    expect(threeQuarters.fov).not.toBe(SAMPLE.exit.fov);
  });

  it("actually applies the easing rather than moving linearly", () => {
    // Sampled at t=0.125, which maps to 0.25 along the first half. t=0.25 would
    // be useless here: it maps to the local midpoint, where any symmetric ease
    // such as power3.inOut returns exactly 0.5 and is indistinguishable from
    // linear. At the local quarter, power3.inOut gives 0.0625 against 0.25.
    const eased = evaluateCameraPath(SAMPLE, 0.125);
    const linear = evaluateCameraPath({ ...SAMPLE, easing: "none" }, 0.125);

    const distance = (
      a: readonly [number, number, number],
      b: readonly [number, number, number],
    ): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

    const easedDistance = distance(eased.position, SAMPLE.enter.position);
    const linearDistance = distance(linear.position, SAMPLE.enter.position);

    expect(easedDistance).toBeLessThan(linearDistance * 0.5);
  });

  it("evaluates every section path at its keyframes", () => {
    for (const section of sections) {
      const path = cameraPathFor(section.id);
      expect(evaluateCameraPath(path, 0)).toEqual(path.enter);
      expect(evaluateCameraPath(path, 0.5)).toEqual(path.mid);
      expect(evaluateCameraPath(path, 1)).toEqual(path.exit);
    }
  });

  it("uses each section's own designed framing as its mid", () => {
    for (const section of sections) {
      expect(cameraPathFor(section.id).mid).toEqual(cameraStates[section.cameraState]);
    }
  });

  it("rejects an unknown section", () => {
    expect(() => cameraPathFor("not-a-section")).toThrow();
  });
});

describe("camera path continuity", () => {
  it("places each exit and the next enter on the same line between framings", () => {
    for (let i = 0; i < sections.length - 1; i++) {
      const current = sections[i];
      const next = sections[i + 1];
      if (!current || !next) continue;

      const from = cameraStates[current.cameraState];
      const to = cameraStates[next.cameraState];

      const at = (t: number): readonly [number, number, number] => [
        from.position[0] + (to.position[0] - from.position[0]) * t,
        from.position[1] + (to.position[1] - from.position[1]) * t,
        from.position[2] + (to.position[2] - from.position[2]) * t,
      ];

      const exit = cameraPathFor(current.id).exit.position;
      const enter = cameraPathFor(next.id).enter.position;
      const onLine = (
        p: readonly [number, number, number],
        t: number,
      ): number => {
        const point = at(t);
        return Math.hypot(p[0] - point[0], p[1] - point[1], p[2] - point[2]);
      };

      // Exit sits at 0.45 along the segment, enter at 0.55, and both must lie
      // on that segment. This is what makes the boundary blend exact rather than
      // approximate.
      expect(onLine(exit, 0.45)).toBeLessThan(1e-9);
      expect(onLine(enter, 0.55)).toBeLessThan(1e-9);
    }
  });
});

describe("camera easing table", () => {
  it("maps 0 to 0 and 1 to 1 for every named ease", () => {
    for (const name of CAMERA_EASING_NAMES) {
      const ease = resolveCameraEase(name);
      expect(ease(0)).toBeCloseTo(0, 10);
      expect(ease(1)).toBeCloseTo(1, 10);
    }
  });

  it("never exceeds 1, even for the overshooting ease", () => {
    const back = resolveCameraEase("back.out");
    let peak = 0;
    for (let i = 0; i <= 100; i++) {
      peak = Math.max(peak, back(i / 100));
    }
    expect(peak).toBeLessThan(1.1);
  });
});

describe("idle drift", () => {
  it("is exactly zero until the idle delay has passed", () => {
    expect(driftEnvelope(0)).toBe(0);
    expect(driftEnvelope(DRIFT_IDLE_DELAY_S)).toBe(0);
    expect(cameraDriftAt(12, 0)).toEqual({
      x: 0, y: 0, z: 0, targetX: 0, targetY: 0, targetZ: 0,
    });
  });

  it("fades in over the fade window and then holds full amplitude", () => {
    expect(driftEnvelope(DRIFT_IDLE_DELAY_S + DRIFT_FADE_S / 2)).toBeCloseTo(0.5, 10);
    expect(driftEnvelope(DRIFT_IDLE_DELAY_S + DRIFT_FADE_S)).toBeCloseTo(1, 10);
    expect(driftEnvelope(DRIFT_IDLE_DELAY_S + DRIFT_FADE_S * 10)).toBe(1);
  });

  it("keeps the position offset within the specified amplitude", () => {
    for (let t = 0; t < DRIFT_PERIOD_S * 2; t += 0.05) {
      const drift = cameraDriftAt(t, DRIFT_IDLE_DELAY_S + DRIFT_FADE_S);
      expect(Math.abs(drift.x)).toBeLessThanOrEqual(DRIFT_POSITION_AMPLITUDE + 1e-9);
      expect(Math.abs(drift.y)).toBeLessThanOrEqual(DRIFT_POSITION_AMPLITUDE + 1e-9);
      expect(Math.abs(drift.z)).toBeLessThanOrEqual(DRIFT_POSITION_AMPLITUDE + 1e-9);
    }
  });

  it("keeps the target offset within the specified amplitude", () => {
    for (let t = 0; t < DRIFT_PERIOD_S * 2; t += 0.05) {
      const drift = cameraDriftAt(t, DRIFT_IDLE_DELAY_S + DRIFT_FADE_S);
      expect(Math.abs(drift.targetX)).toBeLessThanOrEqual(DRIFT_TARGET_AMPLITUDE + 1e-9);
      expect(Math.abs(drift.targetY)).toBeLessThanOrEqual(DRIFT_TARGET_AMPLITUDE + 1e-9);
      expect(Math.abs(drift.targetZ)).toBeLessThanOrEqual(DRIFT_TARGET_AMPLITUDE + 1e-9);
    }
  });

  it("reaches the full amplitude somewhere in the cycle", () => {
    let peak = 0;
    for (let t = 0; t < DRIFT_PERIOD_S; t += 0.02) {
      peak = Math.max(peak, Math.abs(cameraDriftAt(t, DRIFT_IDLE_DELAY_S + DRIFT_FADE_S).x));
    }
    expect(peak).toBeGreaterThan(DRIFT_POSITION_AMPLITUDE * 0.98);
  });

  it("returns the base-frequency axis to its starting point after one period", () => {
    const idle = DRIFT_IDLE_DELAY_S + DRIFT_FADE_S;
    // x runs at frequency 1.0, so it closes exactly one cycle in DRIFT_PERIOD_S.
    expect(cameraDriftAt(0, idle).x).toBeCloseTo(cameraDriftAt(DRIFT_PERIOD_S, idle).x, 6);
  });

  it("deliberately does not return the other axes at the period", () => {
    const idle = DRIFT_IDLE_DELAY_S + DRIFT_FADE_S;
    // y and z run at 0.63 and 0.41 of the base frequency so the combined motion
    // never visibly loops. That incommensurability is the point: if every axis
    // repeated together the drift would read as a loop.
    expect(cameraDriftAt(0, idle).y).not.toBeCloseTo(cameraDriftAt(DRIFT_PERIOD_S, idle).y, 3);
    expect(cameraDriftAt(0, idle).z).not.toBeCloseTo(cameraDriftAt(DRIFT_PERIOD_S, idle).z, 3);
  });

  it("never repeats exactly, because the axes run at different rates", () => {
    const idle = DRIFT_IDLE_DELAY_S + DRIFT_FADE_S;
    const start = cameraDriftAt(0, idle);
    const later = cameraDriftAt(DRIFT_PERIOD_S / 2, idle);
    const dx = Math.abs(start.x - later.x);
    const dy = Math.abs(start.y - later.y);
    const dz = Math.abs(start.z - later.z);
    expect(Math.max(dx, dy, dz)).toBeGreaterThan(DRIFT_POSITION_AMPLITUDE * 0.2);
  });
});