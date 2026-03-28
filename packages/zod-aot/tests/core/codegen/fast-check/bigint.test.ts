import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckBigInt", () => {
  it("plain bigint: accepts 1n, rejects 1", () => {
    const fn = compileFastCheck({ type: "bigint", checks: [] });
    expect(fn?.(1n)).toBe(true);
    expect(fn?.(1)).toBe(false);
  });

  it("with coerce: returns null", () => {
    expect(compileFastCheck({ type: "bigint", checks: [], coerce: true })).toBeNull();
  });

  it("bigint_greater_than inclusive", () => {
    const fn = compileFastCheck({
      type: "bigint",
      checks: [{ kind: "bigint_greater_than", value: "10", inclusive: true }],
    });
    expect(fn?.(10n)).toBe(true);
    expect(fn?.(9n)).toBe(false);
  });

  it("bigint_greater_than exclusive", () => {
    const fn = compileFastCheck({
      type: "bigint",
      checks: [{ kind: "bigint_greater_than", value: "10", inclusive: false }],
    });
    expect(fn?.(11n)).toBe(true);
    expect(fn?.(10n)).toBe(false);
  });

  it("bigint_less_than inclusive", () => {
    const fn = compileFastCheck({
      type: "bigint",
      checks: [{ kind: "bigint_less_than", value: "100", inclusive: true }],
    });
    expect(fn?.(100n)).toBe(true);
    expect(fn?.(101n)).toBe(false);
  });

  it("bigint_less_than exclusive", () => {
    const fn = compileFastCheck({
      type: "bigint",
      checks: [{ kind: "bigint_less_than", value: "100", inclusive: false }],
    });
    expect(fn?.(99n)).toBe(true);
    expect(fn?.(100n)).toBe(false);
  });

  it("bigint_multiple_of", () => {
    const fn = compileFastCheck({
      type: "bigint",
      checks: [{ kind: "bigint_multiple_of", value: "3" }],
    });
    expect(fn?.(9n)).toBe(true);
    expect(fn?.(10n)).toBe(false);
  });
});
