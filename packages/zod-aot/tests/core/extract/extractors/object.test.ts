import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { FallbackIR, ObjectIR } from "#src/core/types.js";
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
});
