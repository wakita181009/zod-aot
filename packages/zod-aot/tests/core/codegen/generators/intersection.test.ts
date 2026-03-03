import { describe, expect, it } from "vitest";
import type { IntersectionIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — intersection", () => {
  it("accepts value matching both sides", () => {
    const ir: IntersectionIR = {
      type: "intersection",
      left: { type: "object", properties: { a: { type: "string", checks: [] } } },
      right: { type: "object", properties: { b: { type: "number", checks: [] } } },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ a: "hello", b: 42 }).success).toBe(true);
  });

  it("rejects value missing left side property", () => {
    const ir: IntersectionIR = {
      type: "intersection",
      left: { type: "object", properties: { a: { type: "string", checks: [] } } },
      right: { type: "object", properties: { b: { type: "number", checks: [] } } },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ b: 42 }).success).toBe(false);
  });

  it("rejects value missing right side property", () => {
    const ir: IntersectionIR = {
      type: "intersection",
      left: { type: "object", properties: { a: { type: "string", checks: [] } } },
      right: { type: "object", properties: { b: { type: "number", checks: [] } } },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ a: "hello" }).success).toBe(false);
  });

  it("collects issues from both sides", () => {
    const ir: IntersectionIR = {
      type: "intersection",
      left: { type: "object", properties: { a: { type: "string", checks: [] } } },
      right: { type: "object", properties: { b: { type: "number", checks: [] } } },
    };
    const safeParse = compileIR(ir);
    const result = safeParse({ a: 42, b: "not number" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(2);
  });
});
