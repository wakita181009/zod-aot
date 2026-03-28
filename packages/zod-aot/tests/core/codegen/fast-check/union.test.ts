import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckUnion", () => {
  it("string | number: accepts 'a', accepts 42, rejects true", () => {
    const fn = compileFastCheck({
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
    });
    expect(fn?.("a")).toBe(true);
    expect(fn?.(42)).toBe(true);
    expect(fn?.(true)).toBe(false);
  });

  it("any ineligible option → returns null", () => {
    expect(
      compileFastCheck({
        type: "union",
        options: [
          { type: "string", checks: [] },
          { type: "fallback", reason: "transform" },
        ],
      }),
    ).toBeNull();
  });
});
