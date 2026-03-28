import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckOptional", () => {
  it("optional string: accepts 'a', accepts undefined, rejects 42", () => {
    const fn = compileFastCheck({ type: "optional", inner: { type: "string", checks: [] } });
    expect(fn?.("a")).toBe(true);
    expect(fn?.(undefined)).toBe(true);
    expect(fn?.(42)).toBe(false);
  });

  it("ineligible inner → returns null", () => {
    expect(
      compileFastCheck({ type: "optional", inner: { type: "fallback", reason: "transform" } }),
    ).toBeNull();
  });
});
