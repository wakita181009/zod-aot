import { describe, expect, it } from "vitest";
import type { CatchIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("slow-path — catch", () => {
  it("returns data when inner validation passes", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "string", checks: [] },
      defaultValue: "default",
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("returns defaultValue when inner validation fails", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "string", checks: [] },
      defaultValue: "default",
    };
    const safeParse = compileIR(ir);
    const result = safeParse(42);
    expect(result.success).toBe(true);
    expect(result.data).toBe("default");
  });

  it("returns numeric defaultValue on failure", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "number", checks: [] },
      defaultValue: 0,
    };
    const safeParse = compileIR(ir);
    const result = safeParse("abc");
    expect(result.success).toBe(true);
    expect(result.data).toBe(0);
  });

  it("returns false as defaultValue on failure", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "boolean" },
      defaultValue: false,
    };
    const safeParse = compileIR(ir);
    const result = safeParse("not-a-boolean");
    expect(result.success).toBe(true);
    expect(result.data).toBe(false);
  });

  it("returns null as defaultValue on failure", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "string", checks: [] },
      defaultValue: null,
    };
    const safeParse = compileIR(ir);
    const result = safeParse(42);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("returns undefined as defaultValue on failure", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "string", checks: [] },
      defaultValue: undefined,
    };
    const safeParse = compileIR(ir);
    const result = safeParse(42);
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("returns object as defaultValue on failure", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: {
        type: "object",
        properties: { name: { type: "string", checks: [] } },
      },
      defaultValue: { name: "anon" },
    };
    const safeParse = compileIR(ir);
    const result = safeParse("not-an-object");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "anon" });
  });

  it("catch with inner checks — inner fails check", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "string", checks: [{ kind: "min_length", minimum: 5 }] },
      defaultValue: "short",
    };
    const safeParse = compileIR(ir);
    // "ab" is a string but fails min_length check → catch returns defaultValue
    const result = safeParse("ab");
    expect(result.success).toBe(true);
    expect(result.data).toBe("short");
  });

  it("catch with inner checks — inner passes check", () => {
    const ir: CatchIR = {
      type: "catch",
      inner: { type: "string", checks: [{ kind: "min_length", minimum: 5 }] },
      defaultValue: "short",
    };
    const safeParse = compileIR(ir);
    const result = safeParse("hello world");
    expect(result.success).toBe(true);
    expect(result.data).toBe("hello world");
  });

  it("nested catch in object", () => {
    const ir = {
      type: "object" as const,
      properties: {
        name: {
          type: "catch" as const,
          inner: { type: "string" as const, checks: [] },
          defaultValue: "anonymous",
        },
        age: {
          type: "catch" as const,
          inner: { type: "number" as const, checks: [] },
          defaultValue: 0,
        },
      },
    };
    const safeParse = compileIR(ir);
    const result = safeParse({ name: 42, age: "abc" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "anonymous", age: 0 });
  });
});
