import { describe, expect, it } from "vitest";
import { computeExplodedState } from "../../src/components/three/ProductParts";

describe("reassembly timeline (Milestone I)", () => {
  // Progress ranges (from src/data/sections.ts defaults):
  //   construction 0.50-0.64, switches 0.64-0.72, keycaps 0.72-0.78,
  //   performance 0.78-0.84, configurator 0.84-0.92, finalProduct 0.92-0.97, finale 0.97-1.00

  it("parts are assembled before Construction begins", () => {
    expect(computeExplodedState(0.3)).toBeCloseTo(0, 6);
    expect(computeExplodedState(0.49)).toBeCloseTo(0, 6);
  });

  it("explodes 0 -> 1 through Section 06 (Construction)", () => {
    // Start of construction: not yet exploded
    expect(computeExplodedState(0.5)).toBeCloseTo(0, 6);
    // Mid construction (local 0.5): constructionExploded = 0.5/0.6 = 0.833; cubic easing -> ~0.93
    expect(computeExplodedState(0.57)).toBeCloseTo(0.93, 2);
    // End of construction (local >= EXPLOSION_COMPLETE_AT = 0.6): fully separated
    expect(computeExplodedState(0.62)).toBeCloseTo(1, 6);
  });

  it("holds at 1 through Sections 07-10 (Switches, Keycaps, Performance, Configurator)", () => {
    // Switches (064-0.72)
    expect(computeExplodedState(0.68)).toBeCloseTo(1, 6);
    // Keycaps (072-0.78)
    expect(computeExplodedState(0.75)).toBeCloseTo(1, 6);
    // Performance (078-0.84)
    expect(computeExplodedState(0.81)).toBeCloseTo(1, 6);
    // Configurator (084-0.92)
    expect(computeExplodedState(0.88)).toBeCloseTo(1, 6);
  });

  it("reassembles 1 -> 0 through Section 11 (Reassembly)", () => {
    // Start of reassembly: still fully exploded
    expect(computeExplodedState(0.92)).toBeCloseTo(1, 6);
    // Mid reassembly (local 0.5): half-way reassembled
    expect(computeExplodedState(0.945)).toBeCloseTo(0.5, 1);
    // End of reassembly: fully assembled
    expect(computeExplodedState(0.97)).toBeCloseTo(0, 6);
  });

  it("holds at 0 through Section 12 (Finale)", () => {
    expect(computeExplodedState(0.985)).toBeCloseTo(0, 6);
    expect(computeExplodedState(1)).toBeCloseTo(0, 6);
  });

  it("clamps to [0, 1] outside the declared page range", () => {
    expect(computeExplodedState(-0.1)).toBeCloseTo(0, 6);
    expect(computeExplodedState(1.1)).toBeCloseTo(0, 6);
  });
});
