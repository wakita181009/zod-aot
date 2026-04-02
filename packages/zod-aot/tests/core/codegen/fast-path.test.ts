import { describe, expect, it } from "vitest";
import type { CodeGenContext } from "#src/core/codegen/context.js";
import { createFastGen, generateFast } from "#src/core/codegen/fast-path.js";
import type { SchemaIR, StringIR } from "#src/core/types.js";
import { compileFastCheck } from "./helpers.js";

function makeCtx(overrides?: Partial<CodeGenContext>): CodeGenContext {
  return { preamble: [], counter: 0, fnName: "safeParse_test", ...overrides };
}

describe("createFastGen", () => {
  describe("properties", () => {
    it("exposes input and ctx", () => {
      const ctx = makeCtx();
      const g = createFastGen("input", ctx);
      expect(g.input).toBe("input");
      expect(g.ctx).toBe(ctx);
    });
  });

  describe("temp()", () => {
    it("generates unique variable names with incrementing counter", () => {
      const ctx = makeCtx();
      const g = createFastGen("input", ctx);
      expect(g.temp("k")).toBe("__k_0");
      expect(g.temp("k")).toBe("__k_1");
      expect(g.temp("v")).toBe("__v_2");
      expect(ctx.counter).toBe(3);
    });
  });

  describe("regex()", () => {
    it("adds RegExp declaration to preamble and returns variable name", () => {
      const ctx = makeCtx();
      const g = createFastGen("input", ctx);
      const name = g.regex("tl", "^abc$");
      expect(name).toBe("__re_tl_0");
      expect(ctx.preamble).toHaveLength(1);
      expect(ctx.preamble[0]).toContain("new RegExp");
      expect(ctx.preamble[0]).toContain("^abc$");
    });
  });

  describe("visit()", () => {
    it("generates fast-check expression for a child IR node", () => {
      const ctx = makeCtx();
      const g = createFastGen("input", ctx);
      const ir: StringIR = { type: "string", checks: [] };
      const expr = g.visit(ir);
      expect(expr).toContain('typeof input==="string"');
    });

    it("overrides input for child expression", () => {
      const ctx = makeCtx();
      const g = createFastGen("root", ctx);
      const ir: StringIR = { type: "string", checks: [] };
      const expr = g.visit(ir, { input: "child" });
      expect(expr).toContain('typeof child==="string"');
      expect(expr).not.toContain("root");
    });

    it("inherits parent input when no override given", () => {
      const ctx = makeCtx();
      const g = createFastGen("myVar", ctx);
      const ir: StringIR = { type: "string", checks: [] };
      const expr = g.visit(ir);
      expect(expr).toContain("myVar");
    });

    it("returns null for ineligible schemas (propagation)", () => {
      const ctx = makeCtx();
      const g = createFastGen("input", ctx);
      const ir: SchemaIR = { type: "date", checks: [], coerce: true };
      const expr = g.visit(ir);
      expect(expr).toBeNull();
    });

    it("returns null for effect schemas", () => {
      const ctx = makeCtx();
      const g = createFastGen("input", ctx);
      const ir: SchemaIR = {
        type: "effect",
        effectKind: "transform",
        source: "v => v",
        inner: { type: "string", checks: [] },
      };
      expect(g.visit(ir)).toBeNull();
    });
  });

  describe("generateFast dispatch", () => {
    it("returns expression for eligible types", () => {
      const ctx = makeCtx();
      const g = createFastGen("v", ctx);

      const cases: [SchemaIR, string][] = [
        [{ type: "any" }, "true"],
        [{ type: "unknown" }, "true"],
        [{ type: "null" }, "v===null"],
        [{ type: "undefined" }, "v===undefined"],
        [{ type: "symbol" }, 'typeof v==="symbol"'],
        [{ type: "void" }, "v===undefined"],
        [{ type: "never" }, "false"],
        [{ type: "boolean" }, 'typeof v==="boolean"'],
        [{ type: "nan" }, 'typeof v==="number"&&Number.isNaN(v)'],
      ];

      for (const [ir, expected] of cases) {
        const expr = generateFast(ir, g);
        expect(expr).toBe(expected);
      }
    });

    it("returns null for statically ineligible types", () => {
      const ctx = makeCtx();
      const g = createFastGen("v", ctx);

      const ineligible: SchemaIR["type"][] = [
        "set",
        "map",
        "default",
        "catch",
        "fallback",
        "effect",
      ];

      for (const type of ineligible) {
        // Construct minimal IR for each type
        const ir = makeIneligibleIR(type);
        expect(generateFast(ir, g)).toBeNull();
      }
    });
  });
});

function makeIneligibleIR(type: string): SchemaIR {
  switch (type) {
    case "date":
      return { type: "date", checks: [] };
    case "set":
      return { type: "set", valueType: { type: "string", checks: [] } };
    case "map":
      return {
        type: "map",
        keyType: { type: "string", checks: [] },
        valueType: { type: "string", checks: [] },
      };
    case "default":
      return { type: "default", inner: { type: "string", checks: [] }, defaultValue: "" };
    case "catch":
      return { type: "catch", inner: { type: "string", checks: [] }, defaultValue: "" };
    case "fallback":
      return { type: "fallback", reason: "transform" };
    case "effect":
      return {
        type: "effect",
        effectKind: "transform",
        source: "v => v",
        inner: { type: "string", checks: [] },
      };
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

describe("fast-path — dispatcher", () => {
  it("any → always true", () => {
    const fn = compileFastCheck({ type: "any" });
    expect(fn?.("anything")).toBe(true);
  });

  it("unknown → always true", () => {
    const fn = compileFastCheck({ type: "unknown" });
    expect(fn?.(42)).toBe(true);
  });

  it("null → true for null, false for other", () => {
    const fn = compileFastCheck({ type: "null" });
    expect(fn?.(null)).toBe(true);
    expect(fn?.(undefined)).toBe(false);
  });

  it("undefined → true for undefined, false for other", () => {
    const fn = compileFastCheck({ type: "undefined" });
    expect(fn?.(undefined)).toBe(true);
    expect(fn?.(null)).toBe(false);
  });

  it("symbol → true for Symbol(), false for other", () => {
    const fn = compileFastCheck({ type: "symbol" });
    expect(fn?.(Symbol())).toBe(true);
    expect(fn?.("symbol")).toBe(false);
  });

  it("void → true for undefined, false for other", () => {
    const fn = compileFastCheck({ type: "void" });
    expect(fn?.(undefined)).toBe(true);
    expect(fn?.(null)).toBe(false);
  });

  it("nan → true for NaN, false for 0", () => {
    const fn = compileFastCheck({ type: "nan" });
    expect(fn?.(Number.NaN)).toBe(true);
    expect(fn?.(0)).toBe(false);
  });

  it("never → always false", () => {
    const fn = compileFastCheck({ type: "never" });
    expect(fn?.("anything")).toBe(false);
  });

  it("boolean → true for true/false, false for 0/'true'", () => {
    const fn = compileFastCheck({ type: "boolean" });
    expect(fn?.(true)).toBe(true);
    expect(fn?.(false)).toBe(true);
    expect(fn?.(0)).toBe(false);
    expect(fn?.("true")).toBe(false);
  });

  it("boolean with coerce → null", () => {
    expect(compileFastCheck({ type: "boolean", coerce: true })).toBeNull();
  });

  it("fallback → null", () => {
    expect(compileFastCheck({ type: "fallback", reason: "transform" })).toBeNull();
  });

  it("default → null", () => {
    expect(
      compileFastCheck({
        type: "default",
        inner: { type: "string", checks: [] },
        defaultValue: "",
      }),
    ).toBeNull();
  });

  it("catch → null", () => {
    expect(
      compileFastCheck({ type: "catch", inner: { type: "string", checks: [] }, defaultValue: "" }),
    ).toBeNull();
  });

  it("date → fast check", () => {
    const fn = compileFastCheck({ type: "date", checks: [] });
    expect(fn).not.toBeNull();
    const check = fn as (input: unknown) => boolean;
    expect(check(new Date())).toBe(true);
    expect(check(new Date("invalid"))).toBe(false);
    expect(check("2024-01-01")).toBe(false);
    expect(check(null)).toBe(false);
    expect(check(42)).toBe(false);
  });

  it("date with coerce → null", () => {
    expect(compileFastCheck({ type: "date", checks: [], coerce: true })).toBeNull();
  });

  it("set → null", () => {
    expect(compileFastCheck({ type: "set", valueType: { type: "string", checks: [] } })).toBeNull();
  });

  it("map → null", () => {
    expect(
      compileFastCheck({
        type: "map",
        keyType: { type: "string", checks: [] },
        valueType: { type: "number", checks: [] },
      }),
    ).toBeNull();
  });

  it("recursiveRef → null", () => {
    expect(compileFastCheck({ type: "recursiveRef" })).toBeNull();
  });

  it("templateLiteral → regex check", () => {
    const fn = compileFastCheck({ type: "templateLiteral", pattern: "^hello-\\d+$" });
    expect(fn?.("hello-123")).toBe(true);
    expect(fn?.("goodbye-123")).toBe(false);
    expect(fn?.(42)).toBe(false);
  });

  it("string with coerce → null", () => {
    expect(compileFastCheck({ type: "string", checks: [], coerce: true })).toBeNull();
  });

  it("bigint with coerce → null", () => {
    expect(compileFastCheck({ type: "bigint", checks: [], coerce: true })).toBeNull();
  });
});
