import { describe, expect, it } from "vitest";
import { generateValidator } from "#src/core/codegen/index.js";
import type { EnumIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — enum", () => {
  it("accepts valid enum values", () => {
    const ir: EnumIR = { type: "enum", values: ["admin", "user", "guest"] };
    const safeParse = compileIR(ir);
    expect(safeParse("admin").success).toBe(true);
    expect(safeParse("user").success).toBe(true);
    expect(safeParse("guest").success).toBe(true);
  });

  it("rejects invalid enum values", () => {
    const ir: EnumIR = { type: "enum", values: ["admin", "user", "guest"] };
    const safeParse = compileIR(ir);
    expect(safeParse("superadmin").success).toBe(false);
    expect(safeParse("").success).toBe(false);
    expect(safeParse(42).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
  });

  it("generates Set-based lookup for enums with 4+ values", () => {
    const ir: EnumIR = { type: "enum", values: ["a", "b", "c", "d"] };
    const result = generateValidator(ir, "enumTest");
    expect(result.code).toContain("Set");
  });

  it("generates inline equality checks for enums with 1-3 values", () => {
    const ir: EnumIR = { type: "enum", values: ["admin", "user"] };
    const result = generateValidator(ir, "enumSmall");
    expect(result.code).not.toContain("Set");
    expect(result.functionDef).toContain('!=="admin"');
    expect(result.functionDef).toContain('!=="user"');
  });

  it("inline enum accepts valid values", () => {
    const ir: EnumIR = { type: "enum", values: ["yes", "no"] };
    const safeParse = compileIR(ir);
    expect(safeParse("yes").success).toBe(true);
    expect(safeParse("no").success).toBe(true);
    expect(safeParse("maybe").success).toBe(false);
  });
});
