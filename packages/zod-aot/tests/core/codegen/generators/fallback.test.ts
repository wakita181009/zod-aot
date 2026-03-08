import { describe, expect, it } from "vitest";
import { generateFallbackValidation } from "#src/core/codegen/generators/fallback.js";
import type { FallbackIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — fallback", () => {
  it("generates __fb[N].safeParse call when fallbackIndex is present", () => {
    const ir: FallbackIR = { type: "fallback", reason: "transform", fallbackIndex: 0 };
    const code = generateFallbackValidation(ir, "input", "[]", "__issues");
    expect(code).toContain("__fb[0].safeParse(input)");
    expect(code).toContain("__fb_r0");
  });

  it("generates error push when fallbackIndex is absent", () => {
    const ir: FallbackIR = { type: "fallback", reason: "transform" };
    const code = generateFallbackValidation(ir, "input", "[]", "__issues");
    expect(code).toContain("Fallback schema: transform");
    expect(code).not.toContain("__fb");
  });

  it("uses correct variable names for different indices", () => {
    const ir: FallbackIR = { type: "fallback", reason: "refine", fallbackIndex: 3 };
    const code = generateFallbackValidation(ir, "v", "p", "iss");
    expect(code).toContain("__fb[3].safeParse(v)");
    expect(code).toContain("__fb_r3");
    expect(code).toContain("__fb_i3");
    expect(code).toContain("__fb_j3");
  });

  it("delegates to Zod and validates correctly at runtime", () => {
    const { z } = require("zod");
    const schema = z.string().min(1);
    const ir: FallbackIR = { type: "fallback", reason: "refine", fallbackIndex: 0 };
    const safeParse = compileIR(ir, "test", [schema]);

    expect(safeParse("hello").success).toBe(true);
    expect(safeParse("").success).toBe(false);
  });

  it("writes back transformed data on success", () => {
    const { z } = require("zod");
    const schema = z.string().transform((v: string) => v.toUpperCase());
    const ir: FallbackIR = { type: "fallback", reason: "transform", fallbackIndex: 0 };
    const safeParse = compileIR(ir, "test", [schema]);

    const result = safeParse("hello");
    expect(result.success).toBe(true);
    expect(result.data).toBe("HELLO");
  });
});
