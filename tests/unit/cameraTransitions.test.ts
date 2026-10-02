import { describe, expect, it } from "vitest";
import { cameraStates } from "../../src/data/cameraStates";
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

  it("resolves the final product-to-finale pair at progress one", () => {
    expect(resolveCameraStates(1)).toMatchObject({
      fromSectionId: "finalProduct",
      toSectionId: "finale",
      fromStateId: "finale",
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
