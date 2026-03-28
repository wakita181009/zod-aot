import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckEnum", () => {
  it("small enum (<=3): accepts 'a', rejects 'd'", () => {
    const fn = compileFastCheck({ type: "enum", values: ["a", "b", "c"] });
    expect(fn?.("a")).toBe(true);
    expect(fn?.("d")).toBe(false);
  });

  it("large enum (>3): accepts 'a', rejects 'e'", () => {
    const fn = compileFastCheck({ type: "enum", values: ["a", "b", "c", "d"] });
    expect(fn?.("a")).toBe(true);
    expect(fn?.("e")).toBe(false);
  });

  it("single-value enum", () => {
    const fn = compileFastCheck({ type: "enum", values: ["only"] });
    expect(fn?.("only")).toBe(true);
    expect(fn?.("other")).toBe(false);
  });
});
