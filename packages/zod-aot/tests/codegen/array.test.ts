import { describe, expect, it } from "vitest";
import type { ArrayIR } from "#src/types.js";
import { compileIR } from "./helpers.js";

describe("codegen — array", () => {
  it("accepts valid array", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", "b", "c"])).toEqual({ success: true, data: ["a", "b", "c"] });
  });

  it("accepts empty array", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse([])).toEqual({ success: true, data: [] });
  });

  it("rejects non-array", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse("not array").success).toBe(false);
    expect(safeParse(42).success).toBe(false);
    expect(safeParse({}).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
  });

  it("rejects array with invalid element type", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    const result = safeParse(["valid", 42, "also valid"]);
    expect(result.success).toBe(false);
  });

  it("provides correct path for element errors", () => {
    const ir: ArrayIR = { type: "array", element: { type: "number", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    const result = safeParse([1, "two", 3]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: [1],
    });
  });

  it("validates min_length check", () => {
    const ir: ArrayIR = {
      type: "array",
      element: { type: "string", checks: [] },
      checks: [{ kind: "min_length", minimum: 2 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", "b"]).success).toBe(true);
    expect(safeParse(["a"]).success).toBe(false);
    expect(safeParse([]).success).toBe(false);
  });

  it("validates max_length check", () => {
    const ir: ArrayIR = {
      type: "array",
      element: { type: "string", checks: [] },
      checks: [{ kind: "max_length", maximum: 3 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", "b", "c"]).success).toBe(true);
    expect(safeParse(["a", "b", "c", "d"]).success).toBe(false);
  });

  it("validates length_equals check", () => {
    const ir: ArrayIR = {
      type: "array",
      element: { type: "number", checks: [] },
      checks: [{ kind: "length_equals", length: 3 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse([1, 2, 3]).success).toBe(true);
    expect(safeParse([1, 2]).success).toBe(false);
    expect(safeParse([1, 2, 3, 4]).success).toBe(false);
  });

  it("validates array of objects", () => {
    const ir: ArrayIR = {
      type: "array",
      element: {
        type: "object",
        properties: {
          id: { type: "number", checks: [] },
          name: { type: "string", checks: [] },
        },
      },
      checks: [],
    };
    const safeParse = compileIR(ir);
    expect(safeParse([{ id: 1, name: "Alice" }]).success).toBe(true);
    expect(safeParse([{ id: "one", name: "Alice" }]).success).toBe(false);
  });
});
