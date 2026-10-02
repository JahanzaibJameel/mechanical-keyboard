import { afterEach, describe, expect, it } from "vitest";
import {
  applyMeasuredSectionRanges,
  getSectionRange,
  normalizeSectionRanges,
  resetSectionRangesToDefaults,
  sections,
  type MeasuredSectionBox,
} from "../../src/data/sections";

afterEach(() => {
  resetSectionRangesToDefaults();
});

describe("normalizeSectionRanges", () => {
  it("normalizes equal-height sections against the scroll range", () => {
    // Four 500px sections, 500px of scroll range beyond the viewport.
    const boxes: MeasuredSectionBox[] = [
      { id: "a", top: 0, height: 500 },
      { id: "b", top: 500, height: 500 },
      { id: "c", top: 1000, height: 500 },
      { id: "d", top: 1500, height: 500 },
    ];

    expect(normalizeSectionRanges(boxes, 2000)).toEqual([
      { id: "a", start: 0, end: 0.25 },
      { id: "b", start: 0.25, end: 0.5 },
      { id: "c", start: 0.5, end: 0.75 },
      { id: "d", start: 0.75, end: 1 },
    ]);
  });

  it("orders ranges by document position regardless of input order", () => {
    const boxes: MeasuredSectionBox[] = [
      { id: "third", top: 1000, height: 500 },
      { id: "first", top: 0, height: 500 },
      { id: "second", top: 500, height: 500 },
    ];

    expect(normalizeSectionRanges(boxes, 1500).map((range) => range.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("returns an empty list when there is no scroll range", () => {
    expect(normalizeSectionRanges([{ id: "a", top: 0, height: 900 }], 0)).toEqual([]);
    expect(normalizeSectionRanges([{ id: "a", top: 0, height: 900 }], -10)).toEqual([]);
  });

  it("clamps a range that runs past the end of the document", () => {
    const ranges = normalizeSectionRanges([{ id: "last", top: 800, height: 600 }], 1000);

    expect(ranges).toEqual([{ id: "last", start: 0.8, end: 1 }]);
  });

  it("clamps a negative offset to zero", () => {
    const ranges = normalizeSectionRanges([{ id: "a", top: -100, height: 600 }], 1000);

    expect(ranges).toEqual([{ id: "a", start: 0, end: 0.5 }]);
  });

  it("treats a negative height as zero so end never precedes start", () => {
    const ranges = normalizeSectionRanges([{ id: "a", top: 400, height: -50 }], 1000);

    expect(ranges).toEqual([{ id: "a", start: 0.4, end: 0.4 }]);
  });

  it("handles a taller section by producing a wider window", () => {
    const boxes: MeasuredSectionBox[] = [
      { id: "short", top: 0, height: 500 },
      { id: "tall", top: 500, height: 1500 },
      { id: "short2", top: 2000, height: 500 },
    ];

    const ranges = normalizeSectionRanges(boxes, 2500);

    expect(ranges).toEqual([
      { id: "short", start: 0, end: 0.2 },
      { id: "tall", start: 0.2, end: 0.8 },
      { id: "short2", start: 0.8, end: 1 },
    ]);
  });
});

describe("applyMeasuredSectionRanges", () => {
  const measured = sections.map((section, index) => ({
    id: section.id,
    start: index / sections.length,
    end: (index + 1) / sections.length,
  }));

  it("reports no change when the measured windows match the defaults", () => {
    const current = sections.map((section) => ({
      id: section.id,
      start: section.timelineStart,
      end: section.timelineEnd,
    }));

    expect(applyMeasuredSectionRanges(current)).toBe(false);
  });

  it("writes measured windows through to every consumer", () => {
    expect(applyMeasuredSectionRanges(measured)).toBe(true);

    expect(getSectionRange("intro")).toEqual({
      id: "intro",
      start: 0,
      end: 1 / sections.length,
    });
    expect(getSectionRange("construction")?.start).toBeCloseTo(5 / sections.length, 10);
  });

  it("reports a change only when a window actually moves", () => {
    applyMeasuredSectionRanges(measured);
    expect(applyMeasuredSectionRanges(measured)).toBe(false);
  });

  it("rejects a partial set so the schedule never becomes inconsistent", () => {
    const before = sections.map((section) => section.timelineStart);

    expect(applyMeasuredSectionRanges(measured.slice(0, 3))).toBe(false);
    expect(sections.map((section) => section.timelineStart)).toEqual(before);
  });

  it("rejects a set containing an unknown id", () => {
    const withUnknown = [...measured.slice(0, -1), { id: "nope", start: 0.9, end: 1 }];
    const before = sections.map((section) => section.timelineStart);

    expect(applyMeasuredSectionRanges(withUnknown)).toBe(false);
    expect(sections.map((section) => section.timelineStart)).toEqual(before);
  });

  it("rejects a window whose end precedes its start", () => {
    const inverted = measured.map((range) =>
      range.id === "construction" ? { ...range, start: 0.9, end: 0.1 } : range,
    );
    const before = sections.map((section) => section.timelineStart);

    expect(applyMeasuredSectionRanges(inverted)).toBe(false);
    expect(sections.map((section) => section.timelineStart)).toEqual(before);
  });

  it("restores the declared defaults on reset", () => {
    applyMeasuredSectionRanges(measured);
    resetSectionRangesToDefaults();

    expect(getSectionRange("construction")).toEqual({ id: "construction", start: 0.5, end: 0.64 });
  });
});
