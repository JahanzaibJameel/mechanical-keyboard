import { describe, expect, it } from "vitest";
import { EXPLODED_OFFSETS, getSectionLocalProgress } from "../../src/animation/timelines/constructionTimeline";
import { PART_DIMENSIONS } from "../../src/data/productGeometry";

const LAYERS = [
  { id: "keycap", assembledY: PART_DIMENSIONS.keycap.baseY },
  { id: "switch", assembledY: PART_DIMENSIONS.switchRow.baseY },
  { id: "plate", assembledY: PART_DIMENSIONS.plate.y },
  { id: "pcb", assembledY: PART_DIMENSIONS.pcb.y },
  { id: "case", assembledY: PART_DIMENSIONS.case.y },
] as const;

const CONSTRUCTION = {
  id: "construction",
  timelineStart: 0.4228,
  timelineEnd: 0.5073,
};

describe("exploded view geometry", () => {
  it("separates in the documented order at full explosion", () => {
    const ys = LAYERS.map((layer) => layer.assembledY + (EXPLODED_OFFSETS[layer.id] ?? 0)) as [
      number,
      number,
      number,
      number,
      number,
    ];
    const [keycapY, switchY, plateY, pcbY, caseY] = ys;

    // KEYCAPS sits on top, CASE at the bottom.
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
    expect(keycapY).toBeGreaterThan(switchY);
    expect(switchY).toBeGreaterThan(plateY);
    expect(plateY).toBeGreaterThan(pcbY);
    expect(pcbY).toBeGreaterThan(caseY);
  });

  it("travels each layer by its own offset and never more", () => {
    for (const layer of LAYERS) {
      const offset = EXPLODED_OFFSETS[layer.id] ?? 0;
      const assembled = layer.assembledY;
      const full = layer.assembledY + offset;

      expect(assembled + offset * 0).toBe(assembled);
      expect(assembled + offset * 1).toBe(full);
      expect(Math.abs(full - assembled)).toBeCloseTo(Math.abs(offset), 10);
    }
  });

  it("is fully assembled when the local progress is zero", () => {
    const local = getSectionLocalProgress(CONSTRUCTION.timelineStart, CONSTRUCTION);

    expect(local).toBe(0);
    for (const layer of LAYERS) {
      expect(layer.assembledY + (EXPLODED_OFFSETS[layer.id] ?? 0) * local).toBe(layer.assembledY);
    }
  });

  it("is fully separated by the end of the section, not merely started", () => {
    expect(getSectionLocalProgress(CONSTRUCTION.timelineEnd, CONSTRUCTION)).toBe(1);
    expect(getSectionLocalProgress(0.45, CONSTRUCTION)).toBeCloseTo(
      (0.45 - CONSTRUCTION.timelineStart) / (CONSTRUCTION.timelineEnd - CONSTRUCTION.timelineStart),
      10,
    );
  });

  it("clamps outside the section window", () => {
    expect(getSectionLocalProgress(0.1, CONSTRUCTION)).toBe(0);
    expect(getSectionLocalProgress(0.9, CONSTRUCTION)).toBe(1);
  });

  it("reports a complete section when its window has no width", () => {
    expect(getSectionLocalProgress(0.5, { id: "x", timelineStart: 0.5, timelineEnd: 0.5 })).toBe(1);
  });
});
