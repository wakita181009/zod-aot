import { describe, expect, it } from "vitest";
import { generateValidator } from "#src/codegen/index.js";
import type { EnumIR } from "#src/types.js";
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

  it("generates Set-based lookup for enums", () => {
    const ir: EnumIR = { type: "enum", values: ["a", "b", "c"] };
    const result = generateValidator(ir, "enumTest");
    expect(result.code).toContain("Set");
  });
});
