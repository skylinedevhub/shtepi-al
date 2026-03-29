import { describe, it, expect } from "vitest";
import { parseNumericParam } from "../parse-numeric";

describe("parseNumericParam", () => {
  it("parses valid integers", () => {
    expect(parseNumericParam("42")).toBe(42);
    expect(parseNumericParam("0")).toBe(0);
  });

  it("parses valid floats", () => {
    expect(parseNumericParam("3.14")).toBeCloseTo(3.14);
  });

  it("returns undefined for NaN values", () => {
    expect(parseNumericParam("abc")).toBeUndefined();
    expect(parseNumericParam("")).toBeUndefined();
    expect(parseNumericParam("NaN")).toBeUndefined();
  });

  it("returns undefined for null/undefined", () => {
    expect(parseNumericParam(null)).toBeUndefined();
    expect(parseNumericParam(undefined)).toBeUndefined();
  });

  it("returns undefined for Infinity", () => {
    expect(parseNumericParam("Infinity")).toBeUndefined();
    expect(parseNumericParam("-Infinity")).toBeUndefined();
  });

  it("handles negative numbers", () => {
    expect(parseNumericParam("-5")).toBe(-5);
  });
});
