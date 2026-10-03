import { describe, expect, it } from "vitest";
import { cameraStates } from "../../src/data/cameraStates";
import { sections } from "../../src/data/sections";
import {
  interpolateCameraState,
  resolveCameraStates,
} from "../../src/animation/transitions/cameraTransitions";

describe("camera transitions", () => {
  it("resolves the intro section pair at progress zero", () => {
    expect(resolveCameraStates(0)).toMatchObject({
      fromSectionId: "intro",
      toSectionId: "hero",
      fromStateId: "intro",
      toStateId: "hero",
      t: 0,
    });
  });

  it("resolves the final exploded-to-finale pair at progress one", () => {
    expect(resolveCameraStates(1)).toMatchObject({
      fromSectionId: "finalProduct",
      toSectionId: "finale",
      fromStateId: "reassembly",
      toStateId: "finale",
      t: 1,
    });
  });

  it("resolves the adjacent construction and switches sections at the midpoint boundary", () => {
    expect(resolveCameraStates(0.5)).toMatchObject({
      fromSectionId: "construction",
      toSectionId: "switches",
      fromStateId: "exploded",
      toStateId: "switchMacro",
      t: 0,
    });
  });

  it("returns the exact source state at zero", () => {
    expect(interpolateCameraState(cameraStates.intro, cameraStates.hero, 0)).toEqual(
      cameraStates.intro,
    );
  });

  it("returns the exact destination state at one", () => {
    expect(interpolateCameraState(cameraStates.intro, cameraStates.hero, 1)).toEqual(
      cameraStates.hero,
    );
  });

  it("returns the midpoint between source and destination camera values", () => {
    const from = cameraStates.intro;
    const to = cameraStates.hero;

    expect(interpolateCameraState(from, to, 0.5)).toEqual({
      position: [
        (from.position[0] + to.position[0]) / 2,
        (from.position[1] + to.position[1]) / 2,
        (from.position[2] + to.position[2]) / 2,
      ],
      target: [
        (from.target[0] + to.target[0]) / 2,
        (from.target[1] + to.target[1]) / 2,
        (from.target[2] + to.target[2]) / 2,
      ],
      fov: (from.fov + to.fov) / 2,
    });
  });
});

describe("camera state coverage", () => {
  it("gives every section its own camera state", () => {
    const assigned = sections.map((section) => section.cameraState);
    const seen = new Set<string>();
    const duplicates = assigned.filter((state) => {
      if (seen.has(state)) {
        return true;
      }
      seen.add(state);
      return false;
    });

    expect(duplicates).toEqual([]);
  });

  it("defines a camera state for every state the sections reference", () => {
    for (const section of sections) {
      expect(cameraStates).toHaveProperty(section.cameraState);
    }
  });

  it("leaves no camera state unassigned", () => {
    const assigned = new Set<string>(sections.map((section) => section.cameraState));
    const orphans = Object.keys(cameraStates).filter((key) => !assigned.has(key));

    expect(orphans).toEqual([]);
  });

  // A view direction within a couple of degrees of straight up makes
  // Matrix4.lookAt degenerate, because there is no unique right vector: the
  // roll it produces is arbitrary and swings under small camera moves. The
  // `top` state that used to sit in this table was 1.24 degrees off vertical
  // with a cross product of 0.0216, against 0.36 to 0.99 for every other state,
  // which is why it was deleted rather than assigned. This guards against a
  // similar framing being reintroduced.
  it("keeps every camera state clear of the lookAt singularity", () => {
    const DEGENERATE = 0.3;

    const nearSingular = Object.entries(cameraStates)
      .map(([id, state]) => {
        // cross((0,1,0), unitView) reduces to (uz, 0, -ux), so its length is
        // just the horizontal part of the unit view direction.
        const vx = state.target[0] - state.position[0];
        const vy = state.target[1] - state.position[1];
        const vz = state.target[2] - state.position[2];
        const length = Math.hypot(vx, vy, vz);

        return { id, horizontal: Math.hypot(vx / length, vz / length) };
      })
      .filter((entry) => entry.horizontal < DEGENERATE)
      .map((entry) => `${entry.id}=${entry.horizontal.toFixed(3)}`);

    expect(nearSingular).toEqual([]);
  });
});
