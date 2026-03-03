import { describe, expect, it } from "vitest";
import type { TupleIR } from "#src/types.js";
import { compileIR } from "./helpers.js";

describe("codegen — tuple", () => {
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
});
