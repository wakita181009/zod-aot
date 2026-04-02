import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { CodeGenContext } from "#src/core/codegen/context.js";
import { slowFallback } from "#src/core/codegen/schemas/fallback.js";
import { createSlowGen } from "#src/core/codegen/slow-path.js";
import type { FallbackIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("slow-path — fallback", () => {
  it("generates __fb[N].safeParse call when fallbackIndex is present", () => {
    const ir: FallbackIR = { type: "fallback", reason: "transform", fallbackIndex: 0 };
    const ctx: CodeGenContext = { preamble: [], counter: 0, fnName: "safeParse_test" };
    const g = createSlowGen("input", "input", "[]", "__issues", ctx);
    const code = slowFallback(ir, g);
    expect(code).toContain("__fb[0].safeParse(input)");
    expect(code).toContain("__fb_r0");
  });

  it("generates error push when fallbackIndex is absent", () => {
    const ir: FallbackIR = { type: "fallback", reason: "transform" };
    const ctx: CodeGenContext = { preamble: [], counter: 0, fnName: "safeParse_test" };
    const g = createSlowGen("input", "input", "[]", "__issues", ctx);
    const code = slowFallback(ir, g);
    expect(code).toContain("Fallback schema: transform");
    expect(code).not.toContain("__fb");
  });

  it("uses correct variable names for different indices", () => {
    const ir: FallbackIR = { type: "fallback", reason: "refine", fallbackIndex: 3 };
    const ctx: CodeGenContext = { preamble: [], counter: 0, fnName: "safeParse_test" };
    const g = createSlowGen("v", "v", "p", "iss", ctx);
    const code = slowFallback(ir, g);
    expect(code).toContain("__fb[3].safeParse(v)");
    expect(code).toContain("__fb_r3");
    expect(code).toContain("__fb_i3");
    expect(code).toContain("__fb_j3");
  });

  it("delegates to Zod and validates correctly at runtime", () => {
    const schema = z.string().min(1);
    const ir: FallbackIR = { type: "fallback", reason: "refine", fallbackIndex: 0 };
    const safeParse = compileIR(ir, "test", [schema]);

    expect(safeParse("hello").success).toBe(true);
    expect(safeParse("").success).toBe(false);
  });

  it("writes back transformed data on success", () => {
    const schema = z.string().transform((v: string) => v.toUpperCase());
    const ir: FallbackIR = { type: "fallback", reason: "transform", fallbackIndex: 0 };
    const safeParse = compileIR(ir, "test", [schema]);

    const result = safeParse("hello");
    expect(result.success).toBe(true);
    expect(result.data).toBe("HELLO");
  });
});
