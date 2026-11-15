import { describe, expect, it } from "vitest";
import type { TupleIR } from "#src/core/types.js";
import { compileFastCheck, compileIR } from "../helpers.js";

describe("slow-path — tuple", () => {
  it("accepts valid tuple", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
      rest: null,
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["hello", 42]).success).toBe(true);
  });

  it("rejects non-array", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: null,
    };
    const safeParse = compileIR(ir);
    expect(safeParse("not array").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse({}).success).toBe(false);
  });

  it("rejects wrong element type", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
      rest: null,
    };
    const safeParse = compileIR(ir);
    expect(safeParse([42, "hello"]).success).toBe(false);
  });

  it("rejects extra elements without rest", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: null,
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", "b"]).success).toBe(false);
  });

  it("accepts extra elements with rest", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", 1, 2, 3]).success).toBe(true);
  });

  it("validates rest element types", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", 1, "bad"]).success).toBe(false);
  });

  it("provides correct path for element errors", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
      rest: null,
    };
    const safeParse = compileIR(ir);
    const result = safeParse(["hello", "not a number"]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [1] });
  });

  // H3: Tuple should reject arrays with fewer elements than required
  it("rejects array with fewer elements than required (no rest)", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
      rest: null,
    };
    const safeParse = compileIR(ir);
    // Missing second element — should fail
    const result = safeParse(["hello"]);
    expect(result.success).toBe(false);
    // Should have a meaningful error, ideally "too_small" rather than just
    // "Expected number, received undefined" for element [1]
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects empty array for non-empty tuple", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: null,
    };
    const safeParse = compileIR(ir);
    const result = safeParse([]);
    expect(result.success).toBe(false);
  });

  it("rejects array with fewer elements than required (with rest)", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
      rest: { type: "boolean" },
    };
    const safeParse = compileIR(ir);
    // With rest there is no length check: the missing item is parsed as undefined.
    const result = safeParse(["hello"]);
    expect(result.error?.issues).toMatchObject([
      { code: "invalid_type", expected: "number", path: [1] },
    ]);
  });
});

describe("slow-path — tuple absence (Zod >= 4.4 rules)", () => {
  const n = { type: "number", checks: [] } as const;
  const optStr = { type: "optional", inner: { type: "string", checks: [] } } as const;

  it("too_small reports optinStart, and too_big does not stop item checks", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [n, optStr],
      rest: null,
      absence: {
        mode: "current",
        optinStart: 1,
        optoutStart: 1,
        skipAbsent: [false, true],
        trimUndefined: [false, true],
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse([1])).toEqual({ success: true, data: [1] });
    expect(safeParse([]).error?.issues).toMatchObject([{ code: "too_small", minimum: 1 }]);
    expect(safeParse(["x", "a", 2]).error?.issues).toMatchObject([
      { code: "too_big", maximum: 2 },
      { code: "invalid_type", path: [0] },
    ]);
  });

  it("fills an absent item before optoutStart and trims a trailing undefined after it", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [n, optStr, { type: "unknown" }],
      rest: null,
      absence: {
        mode: "current",
        optinStart: 1,
        optoutStart: 3,
        skipAbsent: [false, false, false],
        trimUndefined: [false, true, false],
      },
    };
    const data = compileIR(ir)([1]).data as unknown[];
    expect(data).toHaveLength(3);
    expect(1 in data && 2 in data).toBe(true);
  });

  it("drops the issues of an absent item past optoutStart and ends the output", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [n, { type: "string", checks: [] }],
      rest: null,
      absence: {
        mode: "current",
        optinStart: 1,
        optoutStart: 1,
        skipAbsent: [false, false],
        trimUndefined: [false, true],
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse([1])).toEqual({ success: true, data: [1] });
    expect(safeParse([1, 2]).error?.issues).toMatchObject([{ code: "invalid_type", path: [1] }]);
  });

  it("reports rest issues before item issues", () => {
    const ir: TupleIR = { type: "tuple", items: [n], rest: { type: "string", checks: [] } };
    expect(compileIR(ir)(["x", 2]).error?.issues).toMatchObject([
      { code: "invalid_type", path: [1] },
      { code: "invalid_type", path: [0] },
    ]);
  });
});

describe("slow-path — tuple absence (Zod < 4.4 rules)", () => {
  const n = { type: "number", checks: [] } as const;
  const str = { type: "string", checks: [] } as const;

  it("lets an input one short through and parses the missing item as undefined", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [n, str],
      rest: null,
      absence: { mode: "legacy", optStart: 2, tooBigInclusive: true },
    };
    const safeParse = compileIR(ir);
    expect(safeParse([1]).error?.issues).toMatchObject([{ code: "invalid_type", path: [1] }]);
    expect(safeParse([]).error?.issues).toEqual([
      { code: "too_small", minimum: 2, origin: "array", input: undefined, path: [] },
    ]);
  });

  it("stops on too_big, with or without inclusive", () => {
    for (const tooBigInclusive of [true, false]) {
      const ir: TupleIR = {
        type: "tuple",
        items: [n],
        rest: null,
        absence: { mode: "legacy", optStart: 1, tooBigInclusive },
      };
      const issues = compileIR(ir)(["x", 2]).error?.issues;
      expect(issues).toHaveLength(1);
      expect(issues?.[0]).toMatchObject({ code: "too_big", maximum: 1 });
      expect(Object.hasOwn(issues?.[0] as object, "inclusive")).toBe(tooBigInclusive);
    }
  });

  it("skips absent items from optStart on", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [n, { type: "optional", inner: str }],
      rest: null,
      absence: { mode: "legacy", optStart: 1, tooBigInclusive: true },
    };
    expect(compileIR(ir)([1])).toEqual({ success: true, data: [1] });
  });
});

describe("fast-path — Tuple", () => {
  it("[string, number]: accepts ['a', 1], rejects ['a', 'b']", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
      rest: null,
    });
    expect(fn?.(["a", 1])).toBe(true);
    expect(fn?.(["a", "b"])).toBe(false);
  });

  it("exact length (no rest): rejects extra elements", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: null,
    });
    expect(fn?.(["a"])).toBe(true);
    expect(fn?.(["a", "b"])).toBe(false);
  });

  it("with rest element", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: { type: "number", checks: [] },
    });
    expect(fn?.(["a", 1, 2])).toBe(true);
    expect(fn?.(["a", 1, "b"])).toBe(false);
  });

  it("items with 'any' type skip per-index check", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [{ type: "any" }, { type: "string", checks: [] }],
      rest: null,
    });
    expect(fn?.([42, "hello"])).toBe(true);
    expect(fn?.([42, 123])).toBe(false);
  });

  it("rest element with 'any' type skips .every()", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: { type: "any" },
    });
    expect(fn?.(["a", 1, true, null])).toBe(true);
    expect(fn?.([42, 1, true])).toBe(false);
  });

  it("ineligible rest element → returns null", () => {
    expect(
      compileFastCheck({
        type: "tuple",
        items: [{ type: "string", checks: [] }],
        rest: { type: "fallback", reason: "transform" },
      }),
    ).toBeNull();
  });

  it("ineligible item → returns null", () => {
    expect(
      compileFastCheck({
        type: "tuple",
        items: [{ type: "fallback", reason: "transform" }],
        rest: null,
      }),
    ).toBeNull();
  });
});

describe("fast-path — tuple absence", () => {
  const n = { type: "number", checks: [] } as const;
  const optStr = { type: "optional", inner: { type: "string", checks: [] } } as const;

  it("accepts a short input whose missing items are skipped", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [n, optStr],
      rest: null,
      absence: {
        mode: "current",
        optinStart: 1,
        optoutStart: 1,
        skipAbsent: [false, true],
        trimUndefined: [false, true],
      },
    });
    expect(fn?.([1])).toBe(true);
    expect(fn?.([1, "a"])).toBe(true);
    expect(fn?.([1, 2])).toBe(false);
    expect(fn?.([])).toBe(false);
  });

  it("sends short inputs whose missing items would be filled to the slow path", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [n, optStr],
      rest: null,
      absence: {
        mode: "current",
        optinStart: 1,
        optoutStart: 2,
        skipAbsent: [false, false],
        trimUndefined: [false, true],
      },
    });
    expect(fn?.([1])).toBe(false);
    expect(fn?.([1, "a"])).toBe(true);
  });

  it("legacy rules: accepts inputs from optStart on", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [n, optStr],
      rest: null,
      absence: { mode: "legacy", optStart: 1, tooBigInclusive: true },
    });
    expect(fn?.([1])).toBe(true);
    expect(fn?.([])).toBe(false);
  });
});

describe("slow-path — tuple absence with a copied output", () => {
  it("ends the copied output at a skipped absent item", () => {
    const ir: TupleIR = {
      type: "tuple",
      items: [
        { type: "number", checks: [], coerce: true },
        { type: "optional", inner: { type: "string", checks: [] } },
      ],
      rest: null,
      absence: {
        mode: "current",
        optinStart: 1,
        optoutStart: 1,
        skipAbsent: [false, true],
        trimUndefined: [false, true],
      },
    };
    const input = ["1"];
    expect(compileIR(ir)(input)).toEqual({ success: true, data: [1] });
    expect(input).toEqual(["1"]);
  });
});
