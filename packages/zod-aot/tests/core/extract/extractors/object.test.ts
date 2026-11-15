import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mayAcceptUndefined } from "#src/core/codegen/context.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { FallbackIR, ObjectIR, SchemaIR } from "#src/core/types.js";
import { zodAtLeast } from "../../../zod-version.js";

describe("extractObject", () => {
  it("extracts empty object", () => {
    const ir = extractSchema(z.object({})) as ObjectIR;
    expect(ir).toEqual({ type: "object", properties: {} });
  });

  it("extracts object with multiple properties", () => {
    const ir = extractSchema(z.object({ name: z.string(), age: z.number() })) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(Object.keys(ir.properties)).toEqual(["name", "age"]);
    expect(ir.properties["name"]?.type).toBe("string");
    expect(ir.properties["age"]?.type).toBe("number");
  });

  it("extracts nested objects", () => {
    const ir = extractSchema(z.object({ inner: z.object({ x: z.number() }) })) as ObjectIR;
    expect(ir.properties["inner"]?.type).toBe("object");
    const inner = ir.properties["inner"] as ObjectIR;
    expect(inner.properties["x"]?.type).toBe("number");
  });

  it("falls back for object with non-compilable refine", () => {
    const captured = "external";
    const schema = z.object({ x: z.string() }).refine((v) => v.x === captured);
    const refs: { schema: unknown; accessPath: string }[] = [];
    const ir = extractSchema(schema, refs);
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("refine");
  });

  it("compiles a zero-capture object refine into object checks", () => {
    const ir = extractSchema(z.object({ a: z.number() }).refine((v) => v.a > 0)) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(ir.checks).toEqual([expect.objectContaining({ kind: "refine_effect" })]);
  });
});

describe("extractObject — presenceKeys", () => {
  const schema = z.object({
    unknown: z.unknown(),
    any: z.any(),
    undef: z.undefined(),
    orUndef: z.union([z.string(), z.undefined()]),
    str: z.string(),
    opt: z.unknown().optional(),
    // .catch() is left out: its optin changed within 4.x (unset in 4.4.0, "optional" by 4.6).
    def: z.unknown().default(1),
  });

  it.skipIf(!zodAtLeast("4.4"))(
    "lists required keys whose schema accepts undefined (Zod >= 4.4)",
    () => {
      const ir = extractSchema(schema) as ObjectIR;
      expect(ir.presenceKeys).toEqual(["unknown", "any", "undef", "orUndef"]);
    },
  );

  it.skipIf(zodAtLeast("4.4"))("omits presenceKeys before Zod 4.4", () => {
    expect(extractSchema(schema)).not.toHaveProperty("presenceKeys");
  });

  it("omits presenceKeys when no required key accepts undefined", () => {
    const ir = extractSchema(z.object({ a: z.string(), b: z.number().optional() }));
    expect(ir).not.toHaveProperty("presenceKeys");
  });

  // The gate reads the schema instance's own version, so overriding it
  // exercises both sides regardless of the installed Zod.
  function withVersion(version: { major: number; minor: number } | undefined) {
    const s = z.object({ a: z.unknown(), b: z.string() });
    (s._zod as { version?: unknown }).version = version;
    return extractSchema(s) as ObjectIR;
  }

  it.each([
    [{ major: 4, minor: 4 }, ["a"]],
    [{ major: 4, minor: 6 }, ["a"]],
    [{ major: 5, minor: 0 }, ["a"]],
    [{ major: 4, minor: 3 }, undefined],
    [undefined, undefined],
  ])("version %o → presenceKeys %o", (version, expected) => {
    expect(withVersion(version).presenceKeys).toEqual(expected);
  });
});

describe("mayAcceptUndefined", () => {
  const str: SchemaIR = { type: "string", checks: [] };
  const cases: [string, SchemaIR, boolean][] = [
    ["string", str, false],
    ["coerced string", { type: "string", checks: [], coerce: true }, true],
    ["number", { type: "number", checks: [] }, false],
    ["coerced number", { type: "number", checks: [], coerce: true }, true],
    ["boolean", { type: "boolean" }, false],
    ["coerced boolean", { type: "boolean", coerce: true }, true],
    ["bigint", { type: "bigint", checks: [] }, false],
    ["date", { type: "date", checks: [] }, false],
    ["undefined", { type: "undefined" }, true],
    ["void", { type: "void" }, true],
    ["any", { type: "any" }, true],
    ["unknown", { type: "unknown" }, true],
    ["optional", { type: "optional", inner: str }, true],
    ["default", { type: "default", inner: str, refIndex: 0 }, true],
    ["catch", { type: "catch", inner: str, defaultValue: "x" }, true],
    ["fallback", { type: "fallback", reason: "transform" }, true],
    ["recursiveRef", { type: "recursiveRef" }, true],
    ["nullable string", { type: "nullable", inner: str }, false],
    ["nullable unknown", { type: "nullable", inner: { type: "unknown" } }, true],
    ["readonly unknown", { type: "readonly", inner: { type: "unknown" } }, true],
    [
      "transform of unknown",
      { type: "effect", effectKind: "transform", source: "v=>v", inner: { type: "unknown" } },
      true,
    ],
    ["pipe from string", { type: "pipe", in: str, out: { type: "unknown" } }, false],
    ["pipe from unknown", { type: "pipe", in: { type: "unknown" }, out: str }, true],
    ["literal", { type: "literal", values: ["a"] }, false],
    ["literal with undefined", { type: "literal", values: ["a", undefined as never] }, true],
    ["union without undefined", { type: "union", options: [str, { type: "null" }] }, false],
    ["union with undefined", { type: "union", options: [str, { type: "undefined" }] }, true],
    ["intersection, one side", { type: "intersection", left: { type: "any" }, right: str }, false],
    [
      "intersection, both sides",
      { type: "intersection", left: { type: "any" }, right: { type: "unknown" } },
      true,
    ],
    ["symbol", { type: "symbol" }, false],
    ["null", { type: "null" }, false],
    ["nan", { type: "nan" }, false],
    ["never", { type: "never" }, false],
    ["object", { type: "object", properties: {} }, false],
    ["array", { type: "array", element: str, checks: [] }, false],
  ];

  it.each(cases)("%s → %s", (_name, ir, expected) => {
    expect(mayAcceptUndefined(ir)).toBe(expected);
  });
});

describe("extractObject — unknown-key policy", () => {
  it.each([
    ["z.object", z.object({ a: z.string() }), undefined],
    ["z.strictObject", z.strictObject({ a: z.string() }), "never"],
    ["z.looseObject", z.looseObject({ a: z.string() }), "unknown"],
    ["catchall", z.object({ a: z.string() }).catchall(z.number()), "number"],
  ])("%s → catchall %s", (_name, schema, expected) => {
    expect((extractSchema(schema) as ObjectIR).catchall?.type).toBe(expected);
  });
});

describe("extractObject — absentWrittenKeys", () => {
  function withVersion(version: { major: number; minor: number }) {
    const s = z.object({
      req: z.unknown(),
      opt: z.string().optional(),
      def: z.string().default("d"),
    });
    (s._zod as { version?: unknown }).version = version;
    return extractSchema(s, []) as ObjectIR;
  }

  it("lists every key but optional ones on Zod 4.0", () => {
    // default has optin "optional" but no optout, so Zod 4.0 writes it too.
    expect(withVersion({ major: 4, minor: 0 }).absentWrittenKeys).toEqual(["req", "def"]);
  });

  it("is omitted from Zod 4.1", () => {
    expect(withVersion({ major: 4, minor: 1 })).not.toHaveProperty("absentWrittenKeys");
  });
});

describe("extractIntersection — object sides", () => {
  const a = z.object({ a: z.string() });
  it.each([
    ["strip & strip", z.intersection(a, z.object({ b: z.string() })), "intersection"],
    ["strip & loose", z.intersection(a, z.looseObject({ b: z.string() })), "intersection"],
    ["strict side", z.intersection(z.strictObject({ a: z.string() }), a), "fallback"],
    [
      "catchall side",
      z.intersection(a, z.object({ b: z.string() }).catchall(z.number())),
      "fallback",
    ],
    ["shared nested object", z.intersection(z.object({ o: a }), z.object({ o: a })), "fallback"],
    ["object & non-object", z.intersection(a, z.record(z.string(), z.unknown())), "fallback"],
  ])("%s → %s", (_name, schema, expected) => {
    expect(extractSchema(schema, []).type).toBe(expected);
  });
});

describe("extractIntersection — non-object sides", () => {
  it("compiles when neither side rewrites the value", () => {
    expect(extractSchema(z.intersection(z.string().min(1), z.string().max(3))).type).toBe(
      "intersection",
    );
  });
});
