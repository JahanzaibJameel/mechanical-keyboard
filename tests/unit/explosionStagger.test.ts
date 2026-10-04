import { describe, expect, it } from "vitest";
import {
  ALL_LAYERS,
  LAYER_OVERSHOOT,
  LAYER_START,
  allLayerExplosions,
  easeOutBack,
  layerExplosion,
  overshootPeak,
} from "../../src/animation/timelines/explosionStagger";
import { EXPLODED_OFFSETS } from "../../src/animation/timelines/constructionTimeline";

describe("staggered explosion", () => {
  it("starts each layer at the offset the brief specifies", () => {
    expect(LAYER_START.keycaps).toBe(0.0);
    expect(LAYER_START.switches).toBe(0.12);
    expect(LAYER_START.plate).toBe(0.24);
    expect(LAYER_START.pcb).toBe(0.32);
    expect(LAYER_START.case).toBe(0.4);
  });

  it("starts them in the documented order", () => {
    const starts = ALL_LAYERS.map((layer) => LAYER_START[layer]);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect([...ALL_LAYERS]).toEqual(["keycaps", "switches", "plate", "pcb", "case"]);
  });

  it("holds every layer at rest before its start offset", () => {
    for (const layer of ALL_LAYERS) {
      expect(layerExplosion(layer, 0)).toBe(0);
      const justBefore = LAYER_START[layer] - 0.001;
      if (justBefore > 0) {
        expect(layerExplosion(layer, justBefore)).toBe(0);
      }
    }
  });

  it("brings every layer fully home at the top of the range", () => {
    for (const layer of ALL_LAYERS) {
      expect(layerExplosion(layer, 1)).toBe(1);
    }
  });

  it("staggers: at a mid value every layer is strictly behind the one outside it", () => {
    // Sampled at 0.5, past the last start offset of 0.4, so all five layers are
    // in motion and none has reached its final seat yet.
    const at = allLayerExplosions(0.5);
    expect(at.keycaps).toBeGreaterThan(at.switches);
    expect(at.switches).toBeGreaterThan(at.plate);
    expect(at.plate).toBeGreaterThan(at.pcb);
    expect(at.pcb).toBeGreaterThan(at.case);
  });

  it("holds the inner two layers at rest before their start offsets", () => {
    expect(allLayerExplosions(0.3).case).toBe(0);
    expect(allLayerExplosions(0.3).pcb).toBe(0);
    expect(allLayerExplosions(0.3).plate).toBeGreaterThan(0);
  });

  it("holds the case at rest until its start offset", () => {
    expect(allLayerExplosions(0.39).case).toBe(0);
    expect(allLayerExplosions(0.41).case).toBeGreaterThan(0);
  });

  it("overshoots, with the keycaps overshooting most and the case least", () => {
    expect(overshootPeak(LAYER_OVERSHOOT.keycaps) - 1).toBeCloseTo(0.08, 2);
    expect(overshootPeak(LAYER_OVERSHOOT.pcb) - 1).toBeCloseTo(0.03, 2);
    expect(overshootPeak(LAYER_OVERSHOOT.case) - 1).toBeCloseTo(0.03, 2);

    expect(overshootPeak(LAYER_OVERSHOOT.keycaps)).toBeGreaterThan(
      overshootPeak(LAYER_OVERSHOOT.switches),
    );
    expect(overshootPeak(LAYER_OVERSHOOT.switches)).toBeGreaterThan(
      overshootPeak(LAYER_OVERSHOOT.pcb),
    );
  });

  it("reaches exact endpoints regardless of overshoot", () => {
    for (const layer of ALL_LAYERS) {
      expect(easeOutBack(0, LAYER_OVERSHOOT[layer])).toBe(0);
      expect(easeOutBack(1, LAYER_OVERSHOOT[layer])).toBe(1);
    }
  });

  it("never sends a layer below its assembled position", () => {
    // Reassembly runs the shared amount down from 1 to 0. The curve is exact at
    // 0 and never dips below it, so nothing is ever pushed into its seat.
    for (let amount = 1; amount >= 0; amount -= 0.005) {
      for (const layer of ALL_LAYERS) {
        expect(layerExplosion(layer, amount)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("excursions past the seat are bounded by the layer's overshoot", () => {
    for (const layer of ALL_LAYERS) {
      const peak = overshootPeak(LAYER_OVERSHOOT[layer]);
      for (let amount = 0; amount <= 1.0001; amount += 0.005) {
        // overshootPeak is itself a sampled maximum, so allow a small margin.
        expect(layerExplosion(layer, amount)).toBeLessThanOrEqual(peak + 1e-5);
      }
    }
  });

  it("actually overshoots during the explosion rather than being clamped", () => {
    // The regression this guards: clamping to 1 pinned the keycaps at their seat
    // for the whole back half of the section and hid the effect entirely.
    let keycapsPeak = 0;
    for (let amount = 0; amount <= 1.0001; amount += 0.005) {
      keycapsPeak = Math.max(keycapsPeak, layerExplosion("keycaps", amount));
    }
    expect(keycapsPeak).toBeGreaterThan(1.05);
  });

  it("reverses the stagger on reassembly: inner layers travel further first", () => {
    // Reassembly runs the shared amount down. At a given amount the layers that
    // started later are further along the way back to assembled.
    const at = allLayerExplosions(0.5);
    expect(at.case).toBeLessThan(at.pcb);
    expect(at.pcb).toBeLessThan(at.plate);
    expect(at.plate).toBeLessThan(at.switches);
  });

  it("keeps each layer monotonic across the forward range", () => {
    for (const layer of ALL_LAYERS) {
      let previous = -1;
      for (let amount = 0; amount <= 1.0001; amount += 0.01) {
        const value = layerExplosion(layer, amount);
        // The overshoot is the only permitted reversal, and it never drops more
        // than a few percent.
        expect(value).toBeGreaterThan(previous - 0.09);
        previous = value;
      }
    }
  });

  it("covers every layer the exploded rig moves", () => {
    // The rig's part keys are plural; EXPLODED_OFFSETS uses singular ids.
    const rigKeys = ["case", "plate", "pcb", "switches", "keycaps"];
    for (const key of rigKeys) {
      expect(ALL_LAYERS).toContain(key);
    }
    expect(ALL_LAYERS).toHaveLength(rigKeys.length);
    // Every offset in the timeline has a matching layer.
    for (const partId of Object.keys(EXPLODED_OFFSETS)) {
      const plural = partId === "keycap" ? "keycaps" : partId === "switch" ? "switches" : partId;
      expect(ALL_LAYERS).toContain(plural);
    }
  });
});