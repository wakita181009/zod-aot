import { describe, expect, it } from "vitest";
import type { MapIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — map", () => {
  it("generates code that accepts a Map<string, number>", () => {
    const ir: MapIR = {
      type: "map",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    const m = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    expect(safeParse(m)).toEqual({ success: true, data: m });
  });

  it("generates code that accepts an empty Map", () => {
    const ir: MapIR = {
      type: "map",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(new Map())).toEqual({ success: true, data: new Map() });
  });

  it("generates code that rejects non-Map values", () => {
    const ir: MapIR = {
      type: "map",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ a: 1 }).success).toBe(false);
    expect(safeParse([["a", 1]]).success).toBe(false);
    expect(safeParse("map").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
    expect(safeParse(42).success).toBe(false);
  });

  it("validates Map key types", () => {
    const ir: MapIR = {
      type: "map",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    const badKeys = new Map<unknown, number>([[42, 1]]);
    expect(safeParse(badKeys).success).toBe(false);
  });

  it("validates Map value types", () => {
    const ir: MapIR = {
      type: "map",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    const badValues = new Map<string, unknown>([["a", "not number"]]);
    expect(safeParse(badValues).success).toBe(false);
  });

  it("validates both key and value simultaneously", () => {
    const ir: MapIR = {
      type: "map",
      keyType: { type: "string", checks: [{ kind: "min_length", minimum: 1 }] },
      valueType: { type: "number", checks: [{ kind: "greater_than", value: 0, inclusive: false }] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(new Map([["a", 1]])).success).toBe(true);
    expect(safeParse(new Map([["", 1]])).success).toBe(false);
    expect(safeParse(new Map([["a", 0]])).success).toBe(false);
    expect(safeParse(new Map([["", 0]])).success).toBe(false);
  });

  it("validates nested objects as Map values", () => {
    const ir: MapIR = {
      type: "map",
      keyType: { type: "string", checks: [] },
      valueType: {
        type: "object",
        properties: { id: { type: "number", checks: [] } },
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(new Map([["x", { id: 1 }]])).success).toBe(true);
    expect(safeParse(new Map([["x", { id: "bad" }]])).success).toBe(false);
  });
});
