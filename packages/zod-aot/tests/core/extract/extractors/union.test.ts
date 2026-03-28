import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractUnion } from "#src/core/extract/extractors/union.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { DiscriminatedUnionIR, UnionIR } from "#src/core/types.js";

describe("extractSchema — union", () => {
  it("extracts a string | number union", () => {
    const ir = extractSchema(z.union([z.string(), z.number()])) as UnionIR;
    expect(ir.type).toBe("union");
    expect(ir.options).toHaveLength(2);
    expect(ir.options[0]?.type).toBe("string");
    expect(ir.options[1]?.type).toBe("number");
  });

  it("extracts a union with multiple types", () => {
    const ir = extractSchema(z.union([z.string(), z.number(), z.boolean()])) as UnionIR;
    expect(ir.options).toHaveLength(3);
    expect(ir.options.map((o) => o.type)).toEqual(["string", "number", "boolean"]);
  });

  it("extracts a union containing object schemas", () => {
    const ir = extractSchema(
      z.union([
        z.object({ type: z.literal("a"), value: z.string() }),
        z.object({ type: z.literal("b"), value: z.number() }),
      ]),
    ) as UnionIR;
    expect(ir.options).toHaveLength(2);
    expect(ir.options[0]?.type).toBe("object");
    expect(ir.options[1]?.type).toBe("object");
  });
});

describe("extractSchema — discriminatedUnion", () => {
  it("extracts discriminatedUnion with mapping", () => {
    const ir = extractSchema(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("a"), value: z.string() }),
        z.object({ type: z.literal("b"), count: z.number() }),
      ]),
    ) as DiscriminatedUnionIR;
    expect(ir.type).toBe("discriminatedUnion");
    expect(ir.discriminator).toBe("type");
    expect(ir.options).toHaveLength(2);
    expect(ir.mapping).toEqual({ a: 0, b: 1 });
  });

  it("extracts discriminatedUnion with 3 options", () => {
    const ir = extractSchema(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("circle"), radius: z.number() }),
        z.object({ kind: z.literal("square"), size: z.number() }),
        z.object({ kind: z.literal("rect"), w: z.number(), h: z.number() }),
      ]),
    ) as DiscriminatedUnionIR;
    expect(ir.discriminator).toBe("kind");
    expect(ir.options).toHaveLength(3);
    expect(ir.mapping).toEqual({ circle: 0, square: 1, rect: 2 });
  });

  // M4: All options with literal discriminators should have complete mapping
  it("mapping covers all literal discriminator values", () => {
    const ir = extractSchema(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("a"), value: z.string() }),
        z.object({ type: z.literal("b"), count: z.number() }),
      ]),
    ) as DiscriminatedUnionIR;
    // Every option index should appear in the mapping values
    const mappedIndices = new Set(Object.values(ir.mapping));
    for (let i = 0; i < ir.options.length; i++) {
      expect(mappedIndices.has(i)).toBe(true);
    }
  });

  it("mapping omits options whose discriminator is not a literal", () => {
    const ir = extractSchema(
      z.discriminatedUnion("type", [
        z.object({ type: z.enum(["a", "c"]), value: z.string() }),
        z.object({ type: z.literal("b"), count: z.number() }),
      ]),
    ) as DiscriminatedUnionIR;
    expect(ir.type).toBe("discriminatedUnion");
    expect(ir.options).toHaveLength(2);
    // Only the literal option is mapped
    expect(ir.mapping).toEqual({ b: 1 });
  });

  it("mapping skips non-object options in discriminated union", () => {
    // Directly call extractUnion with a synthetic def containing a non-object option
    const ir = extractUnion(
      {
        discriminator: "type",
        options: [
          { _zod: { def: { type: "string" } } },
          {
            _zod: {
              def: {
                type: "object",
                shape: {
                  type: { _zod: { def: { type: "literal", values: ["b"] } } },
                },
              },
            },
          },
        ],
      } as never,
      "test",
      undefined,
      ((opt: unknown) => {
        const o = opt as { _zod: { def: { type: string } } };
        return o._zod.def.type === "object"
          ? { type: "object" as const, properties: {} }
          : { type: o._zod.def.type as "string", checks: [] };
      }) as never,
    ) as DiscriminatedUnionIR;
    expect(ir.type).toBe("discriminatedUnion");
    expect(ir.mapping).toEqual({ b: 1 });
  });
});
