import { describe, expect, it } from "vitest";
import type { RecordIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — record", () => {
  it("accepts valid record", () => {
    const ir: RecordIR = {
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ a: 1, b: 2 }).success).toBe(true);
  });

  it("accepts empty object", () => {
    const ir: RecordIR = {
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({}).success).toBe(true);
  });

  it("rejects non-object", () => {
    const ir: RecordIR = {
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse("not object").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse([]).success).toBe(false);
  });

  it("rejects invalid value type", () => {
    const ir: RecordIR = {
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ a: "not number" }).success).toBe(false);
  });
});
