import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckReadonly", () => {
  it("readonly string: same as string", () => {
    const fn = compileFastCheck({ type: "readonly", inner: { type: "string", checks: [] } });
    expect(fn?.("a")).toBe(true);
    expect(fn?.(42)).toBe(false);
  });

  it("ineligible inner → returns null", () => {
    expect(
      compileFastCheck({ type: "readonly", inner: { type: "fallback", reason: "transform" } }),
    ).toBeNull();
  });
});
