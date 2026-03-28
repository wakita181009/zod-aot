import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckNullable", () => {
  it("nullable string: accepts 'a', accepts null, rejects 42", () => {
    const fn = compileFastCheck({ type: "nullable", inner: { type: "string", checks: [] } });
    expect(fn?.("a")).toBe(true);
    expect(fn?.(null)).toBe(true);
    expect(fn?.(42)).toBe(false);
  });

  it("ineligible inner → returns null", () => {
    expect(
      compileFastCheck({ type: "nullable", inner: { type: "fallback", reason: "transform" } }),
    ).toBeNull();
  });
});
