import { describe, expect, it } from "vitest";
import { generateValidator } from "#src/codegen/index.js";
import type { DiscriminatedUnionIR } from "#src/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — discriminatedUnion", () => {
  const ir: DiscriminatedUnionIR = {
    type: "discriminatedUnion",
    discriminator: "type",
    options: [
      {
        type: "object",
        properties: {
          type: { type: "literal", values: ["a"] },
          value: { type: "string", checks: [] },
        },
      },
      {
        type: "object",
        properties: {
          type: { type: "literal", values: ["b"] },
          count: { type: "number", checks: [] },
        },
      },
    ],
    mapping: { a: 0, b: 1 },
  };

  it("accepts first discriminator option", () => {
    const safeParse = compileIR(ir);
    expect(safeParse({ type: "a", value: "hello" }).success).toBe(true);
  });

  it("accepts second discriminator option", () => {
    const safeParse = compileIR(ir);
    expect(safeParse({ type: "b", count: 42 }).success).toBe(true);
  });

  it("rejects invalid discriminator value", () => {
    const safeParse = compileIR(ir);
    expect(safeParse({ type: "c" }).success).toBe(false);
  });

  it("rejects non-object", () => {
    const safeParse = compileIR(ir);
    expect(safeParse("not object").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
  });

  it("validates properties of matched option", () => {
    const safeParse = compileIR(ir);
    expect(safeParse({ type: "a", value: 42 }).success).toBe(false);
    expect(safeParse({ type: "b", count: "not number" }).success).toBe(false);
  });

  it("generates switch-based code (not sequential union)", () => {
    const result = generateValidator(ir, "duTest");
    expect(result.functionName).toContain("switch");
    expect(result.functionName).not.toContain("__u_");
  });
});
