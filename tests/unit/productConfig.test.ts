import { describe, expect, it } from "vitest";
import { parseStoredConfig } from "../../src/hooks/useProductConfig";
import { DEFAULT_PRODUCT_CONFIG } from "../../src/types/product";

describe("DEFAULT_PRODUCT_CONFIG", () => {
  it("exposes the documented default shape", () => {
    expect(DEFAULT_PRODUCT_CONFIG).toEqual({
      case: "obsidian",
      keycaps: "ash",
      switchType: "linear",
    });
  });

  it("only references known product ids", () => {
    expect(["obsidian", "silver", "bone"]).toContain(DEFAULT_PRODUCT_CONFIG.case);
    expect(["ash", "snow", "signal"]).toContain(DEFAULT_PRODUCT_CONFIG.keycaps);
    expect(["linear", "tactile", "clicky"]).toContain(DEFAULT_PRODUCT_CONFIG.switchType);
  });
});

describe("parseStoredConfig", () => {
  it("returns a fully valid configuration from a valid payload", () => {
    const parsed = parseStoredConfig(
      JSON.stringify({ case: "silver", keycaps: "signal", switchType: "clicky" }),
    );

    expect(parsed).toEqual({
      case: "silver",
      keycaps: "signal",
      switchType: "clicky",
    });
  });

  it("returns the default configuration for a null payload", () => {
    expect(parseStoredConfig(null)).toEqual(DEFAULT_PRODUCT_CONFIG);
  });

  it("returns the default configuration for an empty string", () => {
    expect(parseStoredConfig("")).toEqual(DEFAULT_PRODUCT_CONFIG);
  });

  it("returns the default configuration for malformed JSON", () => {
    expect(parseStoredConfig("{not-json")).toEqual(DEFAULT_PRODUCT_CONFIG);
  });

  it("returns the default configuration for non-object payloads", () => {
    expect(parseStoredConfig("\"silver\"")).toEqual(DEFAULT_PRODUCT_CONFIG);
    expect(parseStoredConfig("null")).toEqual(DEFAULT_PRODUCT_CONFIG);
    expect(parseStoredConfig("[1,2,3]")).toEqual(DEFAULT_PRODUCT_CONFIG);
    expect(parseStoredConfig("42")).toEqual(DEFAULT_PRODUCT_CONFIG);
  });

  it("falls back per field when stored ids are unknown", () => {
    const parsed = parseStoredConfig(
      JSON.stringify({ case: "neon", keycaps: "ash", switchType: "linear" }),
    );

    expect(parsed).toEqual({
      case: "obsidian",
      keycaps: "ash",
      switchType: "linear",
    });
  });

  it("falls back per field when stored ids have the wrong type", () => {
    const parsed = parseStoredConfig(
      JSON.stringify({ case: 7, keycaps: null, switchType: ["linear"] }),
    );

    expect(parsed).toEqual(DEFAULT_PRODUCT_CONFIG);
  });

  it("merges a partial payload with the defaults", () => {
    const parsed = parseStoredConfig(JSON.stringify({ keycaps: "snow" }));

    expect(parsed).toEqual({
      case: "obsidian",
      keycaps: "snow",
      switchType: "linear",
    });
  });

  it("merges a partial payload that carries an unknown extra key", () => {
    const parsed = parseStoredConfig(
      JSON.stringify({ case: "bone", exploded: true, unknown: "x" }),
    );

    expect(parsed).toEqual({
      case: "bone",
      keycaps: "ash",
      switchType: "linear",
    });
  });

  it("round-trips a configuration through JSON without loss", () => {
    const original = { case: "bone", keycaps: "signal", switchType: "tactile" } as const;

    expect(parseStoredConfig(JSON.stringify(original))).toEqual(original);
  });
});