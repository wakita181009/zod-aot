import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckPipe", () => {
  it("pipe(string, string): accepts 'a', rejects 42", () => {
    const fn = compileFastCheck({
      type: "pipe",
      in: { type: "string", checks: [] },
      out: { type: "string", checks: [] },
    });
    expect(fn?.("a")).toBe(true);
    expect(fn?.(42)).toBe(false);
  });

  it("pipe with ineligible in → returns null", () => {
    expect(
      compileFastCheck({
        type: "pipe",
        in: { type: "fallback", reason: "transform" },
        out: { type: "string", checks: [] },
      }),
    ).toBeNull();
  });

  it("pipe with ineligible out → returns null", () => {
    expect(
      compileFastCheck({
        type: "pipe",
        in: { type: "string", checks: [] },
        out: { type: "fallback", reason: "transform" },
      }),
    ).toBeNull();
  });
});
