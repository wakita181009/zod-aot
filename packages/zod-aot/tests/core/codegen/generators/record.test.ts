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

  // M2: Key and value validation errors should have correct paths
  it("reports value error path pointing to the key", () => {
    const ir: RecordIR = {
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    const result = safeParse({ myKey: "not-a-number" });
    expect(result.success).toBe(false);
    // Value error should have path pointing to the key
    const valueIssue = result.error?.issues.find(
      (i) => (i as Record<string, unknown>).expected === "number",
    ) as Record<string, unknown> | undefined;
    expect(valueIssue).toBeDefined();
    expect(valueIssue?.path).toEqual(["myKey"]);
  });

  it("validates key type constraints", () => {
    const ir: RecordIR = {
      type: "record",
      keyType: { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    // Key "ab" is too short (min 3)
    expect(safeParse({ ab: 1 }).success).toBe(false);
    // Key "abc" is fine
    expect(safeParse({ abc: 1 }).success).toBe(true);
  });

  it("reports both key and value errors for the same entry", () => {
    const ir: RecordIR = {
      type: "record",
      keyType: { type: "string", checks: [{ kind: "min_length", minimum: 5 }] },
      valueType: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    // Key "ab" is too short AND value is wrong type
    const result = safeParse({ ab: "not-a-number" });
    expect(result.success).toBe(false);
    // Should have at least 2 issues: one for key, one for value
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(2);
  });
});
