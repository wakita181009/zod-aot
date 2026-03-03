import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { FallbackEntry } from "#src/core/extractor.js";
import { extractSchema } from "#src/core/extractor.js";
import type {
  AnyIR,
  ArrayIR,
  BooleanIR,
  DateIR,
  DefaultIR,
  DiscriminatedUnionIR,
  EnumIR,
  FallbackIR,
  IntersectionIR,
  LiteralIR,
  NullableIR,
  NullIR,
  NumberIR,
  ObjectIR,
  OptionalIR,
  ReadonlyIR,
  RecordIR,
  StringIR,
  TupleIR,
  UndefinedIR,
  UnionIR,
  UnknownIR,
} from "#src/core/types.js";

// ─── Primitive Types ────────────────────────────────────────────────────────

describe("extractSchema — primitives", () => {
  it("extracts a plain string schema", () => {
    const ir = extractSchema(z.string());
    expect(ir).toEqual<StringIR>({
      type: "string",
      checks: [],
    });
  });

  it("extracts a plain number schema", () => {
    const ir = extractSchema(z.number());
    expect(ir).toEqual<NumberIR>({
      type: "number",
      checks: [],
    });
  });

  it("extracts a boolean schema", () => {
    const ir = extractSchema(z.boolean());
    expect(ir).toEqual<BooleanIR>({
      type: "boolean",
    });
  });

  it("extracts a null schema", () => {
    const ir = extractSchema(z.null());
    expect(ir).toEqual<NullIR>({
      type: "null",
    });
  });

  it("extracts an undefined schema", () => {
    const ir = extractSchema(z.undefined());
    expect(ir).toEqual<UndefinedIR>({
      type: "undefined",
    });
  });
});

// ─── String Checks ──────────────────────────────────────────────────────────

describe("extractSchema — string checks", () => {
  it("extracts min length check", () => {
    const ir = extractSchema(z.string().min(3)) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toContainEqual({ kind: "min_length", minimum: 3 });
  });

  it("extracts max length check", () => {
    const ir = extractSchema(z.string().max(50)) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toContainEqual({ kind: "max_length", maximum: 50 });
  });

  it("extracts length equals check", () => {
    const ir = extractSchema(z.string().length(10)) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toContainEqual({ kind: "length_equals", length: 10 });
  });

  it("extracts combined min + max checks", () => {
    const ir = extractSchema(z.string().min(3).max(50)) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toHaveLength(2);
    expect(ir.checks).toContainEqual({ kind: "min_length", minimum: 3 });
    expect(ir.checks).toContainEqual({ kind: "max_length", maximum: 50 });
  });

  it("extracts regex pattern check", () => {
    const ir = extractSchema(z.string().regex(/^[a-z]+$/)) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toContainEqual({
      kind: "string_format",
      format: "regex",
      pattern: "^[a-z]+$",
    });
  });

  it("extracts email format check", () => {
    const ir = extractSchema(z.email()) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "string_format", format: "email" }),
    );
  });

  it("extracts url format check", () => {
    const ir = extractSchema(z.url()) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "string_format", format: "url" }),
    );
  });

  it("extracts uuid format check", () => {
    const ir = extractSchema(z.uuid()) as StringIR;
    expect(ir.type).toBe("string");
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "string_format", format: "uuid" }),
    );
  });

  it("extracts multiple checks in correct order", () => {
    const ir = extractSchema(z.string().min(1).max(100).regex(/^\w+$/)) as StringIR;
    expect(ir.checks).toHaveLength(3);
    expect(ir.checks[0]?.kind).toBe("min_length");
    expect(ir.checks[1]?.kind).toBe("max_length");
    expect(ir.checks[2]?.kind).toBe("string_format");
  });
});

// ─── Number Checks ──────────────────────────────────────────────────────────

describe("extractSchema — number checks", () => {
  it("extracts min (inclusive) check", () => {
    const ir = extractSchema(z.number().min(0)) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: true });
  });

  it("extracts max (inclusive) check", () => {
    const ir = extractSchema(z.number().max(100)) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 100, inclusive: true });
  });

  it("extracts positive (exclusive > 0) check", () => {
    const ir = extractSchema(z.number().positive()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: false });
  });

  it("extracts negative (exclusive < 0) check", () => {
    const ir = extractSchema(z.number().negative()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 0, inclusive: false });
  });

  it("extracts nonnegative (inclusive >= 0) check", () => {
    const ir = extractSchema(z.number().nonnegative()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: true });
  });

  it("extracts int (safeint format) check", () => {
    const ir = extractSchema(z.number().int()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "number_format", format: "safeint" });
  });

  it("extracts multipleOf check", () => {
    const ir = extractSchema(z.number().multipleOf(5)) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "multiple_of", value: 5 });
  });

  it("extracts combined int + positive checks", () => {
    const ir = extractSchema(z.number().int().positive()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "number_format", format: "safeint" });
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: false });
  });

  it("extracts min + max range checks", () => {
    const ir = extractSchema(z.number().min(1).max(100)) as NumberIR;
    expect(ir.checks).toHaveLength(2);
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 1, inclusive: true });
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 100, inclusive: true });
  });
});

// ─── Object Schemas ─────────────────────────────────────────────────────────

describe("extractSchema — object", () => {
  it("extracts a simple object schema", () => {
    const ir = extractSchema(z.object({ name: z.string() })) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(ir.properties).toHaveProperty("name");
    expect(ir.properties["name"]?.type).toBe("string");
  });

  it("extracts an object with multiple properties", () => {
    const ir = extractSchema(
      z.object({
        name: z.string().min(1),
        age: z.number().int(),
        active: z.boolean(),
      }),
    ) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(Object.keys(ir.properties)).toEqual(["name", "age", "active"]);
    expect(ir.properties["name"]?.type).toBe("string");
    expect(ir.properties["age"]?.type).toBe("number");
    expect(ir.properties["active"]?.type).toBe("boolean");
  });

  it("preserves checks on nested properties", () => {
    const ir = extractSchema(z.object({ name: z.string().min(3).max(50) })) as ObjectIR;
    const nameIR = ir.properties["name"] as StringIR;
    expect(nameIR.checks).toContainEqual({ kind: "min_length", minimum: 3 });
    expect(nameIR.checks).toContainEqual({ kind: "max_length", maximum: 50 });
  });

  it("extracts nested object schemas", () => {
    const ir = extractSchema(
      z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      }),
    ) as ObjectIR;
    expect(ir.properties["user"]?.type).toBe("object");
    const userIR = ir.properties["user"] as ObjectIR;
    expect(userIR.properties["name"]?.type).toBe("string");
    expect(userIR.properties["age"]?.type).toBe("number");
  });

  it("extracts empty object schema", () => {
    const ir = extractSchema(z.object({})) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(ir.properties).toEqual({});
  });

  it("extracts object with optional properties", () => {
    const ir = extractSchema(
      z.object({
        required: z.string(),
        optional: z.string().optional(),
      }),
    ) as ObjectIR;
    expect(ir.properties["required"]?.type).toBe("string");
    expect(ir.properties["optional"]?.type).toBe("optional");
    const optIR = ir.properties["optional"] as OptionalIR;
    expect(optIR.inner.type).toBe("string");
  });
});

// ─── Array Schemas ──────────────────────────────────────────────────────────

describe("extractSchema — array", () => {
  it("extracts a basic array schema", () => {
    const ir = extractSchema(z.array(z.string())) as ArrayIR;
    expect(ir.type).toBe("array");
    expect(ir.element.type).toBe("string");
    expect(ir.checks).toEqual([]);
  });

  it("extracts array with min length check", () => {
    const ir = extractSchema(z.array(z.number()).min(1)) as ArrayIR;
    expect(ir.checks).toContainEqual({ kind: "min_length", minimum: 1 });
  });

  it("extracts array with max length check", () => {
    const ir = extractSchema(z.array(z.number()).max(10)) as ArrayIR;
    expect(ir.checks).toContainEqual({ kind: "max_length", maximum: 10 });
  });

  it("extracts array with length equals check", () => {
    const ir = extractSchema(z.array(z.string()).length(5)) as ArrayIR;
    expect(ir.checks).toContainEqual({ kind: "length_equals", length: 5 });
  });

  it("extracts array of objects", () => {
    const ir = extractSchema(z.array(z.object({ id: z.number(), name: z.string() }))) as ArrayIR;
    expect(ir.element.type).toBe("object");
    const elemIR = ir.element as ObjectIR;
    expect(elemIR.properties["id"]?.type).toBe("number");
    expect(elemIR.properties["name"]?.type).toBe("string");
  });

  it("extracts nested arrays", () => {
    const ir = extractSchema(z.array(z.array(z.string()))) as ArrayIR;
    expect(ir.element.type).toBe("array");
    const innerIR = ir.element as ArrayIR;
    expect(innerIR.element.type).toBe("string");
  });
});

// ─── Enum Schemas ───────────────────────────────────────────────────────────

describe("extractSchema — enum", () => {
  it("extracts enum values", () => {
    const ir = extractSchema(z.enum(["admin", "user", "guest"])) as EnumIR;
    expect(ir.type).toBe("enum");
    expect(ir.values).toEqual(["admin", "user", "guest"]);
  });

  it("extracts single-value enum", () => {
    const ir = extractSchema(z.enum(["only"])) as EnumIR;
    expect(ir.type).toBe("enum");
    expect(ir.values).toEqual(["only"]);
  });
});

// ─── Literal Schemas ────────────────────────────────────────────────────────

describe("extractSchema — literal", () => {
  it("extracts string literal", () => {
    const ir = extractSchema(z.literal("hello")) as LiteralIR;
    expect(ir.type).toBe("literal");
    expect(ir.values).toEqual(["hello"]);
  });

  it("extracts number literal", () => {
    const ir = extractSchema(z.literal(42)) as LiteralIR;
    expect(ir.type).toBe("literal");
    expect(ir.values).toEqual([42]);
  });

  it("extracts boolean literal", () => {
    const ir = extractSchema(z.literal(true)) as LiteralIR;
    expect(ir.type).toBe("literal");
    expect(ir.values).toEqual([true]);
  });

  it("extracts null literal", () => {
    const ir = extractSchema(z.literal(null)) as LiteralIR;
    expect(ir.type).toBe("literal");
    expect(ir.values).toEqual([null]);
  });
});

// ─── Union Schemas ──────────────────────────────────────────────────────────

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

// ─── Optional / Nullable Wrappers ───────────────────────────────────────────

describe("extractSchema — optional", () => {
  it("extracts optional string", () => {
    const ir = extractSchema(z.string().optional()) as OptionalIR;
    expect(ir.type).toBe("optional");
    expect(ir.inner.type).toBe("string");
  });

  it("extracts z.optional() wrapper", () => {
    const ir = extractSchema(z.optional(z.number())) as OptionalIR;
    expect(ir.type).toBe("optional");
    expect(ir.inner.type).toBe("number");
  });

  it("preserves inner checks through optional", () => {
    const ir = extractSchema(z.string().min(3).optional()) as OptionalIR;
    expect(ir.inner.type).toBe("string");
    const innerIR = ir.inner as StringIR;
    expect(innerIR.checks).toContainEqual({ kind: "min_length", minimum: 3 });
  });
});

describe("extractSchema — nullable", () => {
  it("extracts nullable string", () => {
    const ir = extractSchema(z.string().nullable()) as NullableIR;
    expect(ir.type).toBe("nullable");
    expect(ir.inner.type).toBe("string");
  });

  it("extracts z.nullable() wrapper", () => {
    const ir = extractSchema(z.nullable(z.number())) as NullableIR;
    expect(ir.type).toBe("nullable");
    expect(ir.inner.type).toBe("number");
  });

  it("preserves inner checks through nullable", () => {
    const ir = extractSchema(z.number().min(0).nullable()) as NullableIR;
    expect(ir.inner.type).toBe("number");
    const innerIR = ir.inner as NumberIR;
    expect(innerIR.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: true });
  });
});

describe("extractSchema — optional + nullable combined", () => {
  it("extracts optional nullable string", () => {
    const ir = extractSchema(z.string().nullable().optional()) as OptionalIR;
    expect(ir.type).toBe("optional");
    expect(ir.inner.type).toBe("nullable");
    const nullableIR = ir.inner as NullableIR;
    expect(nullableIR.inner.type).toBe("string");
  });

  it("extracts nullable optional string", () => {
    const ir = extractSchema(z.string().optional().nullable()) as NullableIR;
    expect(ir.type).toBe("nullable");
    expect(ir.inner.type).toBe("optional");
    const optIR = ir.inner as OptionalIR;
    expect(optIR.inner.type).toBe("string");
  });
});

// ─── Fallback Detection ─────────────────────────────────────────────────────

describe("extractSchema — fallback (non-compilable schemas)", () => {
  it("returns fallback for transform", () => {
    const ir = extractSchema(z.string().transform((v) => parseInt(v, 10)));
    expect(ir).toEqual<FallbackIR>({
      type: "fallback",
      reason: "transform",
    });
  });

  it("returns fallback for refine", () => {
    const ir = extractSchema(z.string().refine((v) => v.startsWith("a")));
    expect(ir).toEqual<FallbackIR>({
      type: "fallback",
      reason: "refine",
    });
  });

  it("returns fallback for superRefine", () => {
    const ir = extractSchema(
      z.string().superRefine((val, ctx) => {
        if (val.length < 3) {
          ctx.addIssue({ code: "custom", message: "too short" });
        }
      }),
    );
    expect(ir).toEqual<FallbackIR>({
      type: "fallback",
      reason: "refine",
    });
  });
});

// ─── Complex / Real-World Schemas ───────────────────────────────────────────

describe("extractSchema — complex real-world schemas", () => {
  it("extracts a user schema", () => {
    const UserSchema = z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(100),
      email: z.email(),
      role: z.enum(["admin", "user", "guest"]),
      active: z.boolean(),
      tags: z.array(z.string()).min(0).max(10),
      metadata: z.object({
        createdAt: z.string(),
        updatedAt: z.string().optional(),
      }),
    });

    const ir = extractSchema(UserSchema) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(Object.keys(ir.properties)).toEqual([
      "id",
      "name",
      "email",
      "role",
      "active",
      "tags",
      "metadata",
    ]);

    // Verify nested types
    expect(ir.properties["id"]?.type).toBe("number");
    expect(ir.properties["name"]?.type).toBe("string");
    expect(ir.properties["email"]?.type).toBe("string");
    expect(ir.properties["role"]?.type).toBe("enum");
    expect(ir.properties["active"]?.type).toBe("boolean");
    expect(ir.properties["tags"]?.type).toBe("array");
    expect(ir.properties["metadata"]?.type).toBe("object");

    // Verify nested checks
    const idIR = ir.properties["id"] as NumberIR;
    expect(idIR.checks).toContainEqual({ kind: "number_format", format: "safeint" });
    expect(idIR.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: false });

    const nameIR = ir.properties["name"] as StringIR;
    expect(nameIR.checks).toContainEqual({ kind: "min_length", minimum: 1 });
    expect(nameIR.checks).toContainEqual({ kind: "max_length", maximum: 100 });

    const tagsIR = ir.properties["tags"] as ArrayIR;
    expect(tagsIR.element.type).toBe("string");
    expect(tagsIR.checks).toContainEqual({ kind: "min_length", minimum: 0 });
    expect(tagsIR.checks).toContainEqual({ kind: "max_length", maximum: 10 });

    // Verify nested object
    const metaIR = ir.properties["metadata"] as ObjectIR;
    expect(metaIR.properties["createdAt"]?.type).toBe("string");
    expect(metaIR.properties["updatedAt"]?.type).toBe("optional");
  });

  it("extracts an API request schema", () => {
    const RequestSchema = z.object({
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
      path: z.string().min(1),
      body: z
        .object({
          data: z.union([z.string(), z.number(), z.boolean()]),
        })
        .optional(),
      headers: z.array(
        z.object({
          key: z.string(),
          value: z.string(),
        }),
      ),
    });

    const ir = extractSchema(RequestSchema) as ObjectIR;
    expect(ir.type).toBe("object");

    const methodIR = ir.properties["method"] as EnumIR;
    expect(methodIR.values).toEqual(["GET", "POST", "PUT", "DELETE"]);

    const bodyIR = ir.properties["body"] as OptionalIR;
    expect(bodyIR.type).toBe("optional");
    expect(bodyIR.inner.type).toBe("object");

    const headersIR = ir.properties["headers"] as ArrayIR;
    expect(headersIR.element.type).toBe("object");
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe("extractSchema — edge cases", () => {
  it("handles deeply nested objects (5 levels)", () => {
    const schema = z.object({
      a: z.object({
        b: z.object({
          c: z.object({
            d: z.object({
              e: z.string(),
            }),
          }),
        }),
      }),
    });

    const ir = extractSchema(schema) as ObjectIR;
    const aIR = ir.properties["a"] as ObjectIR;
    const bIR = aIR.properties["b"] as ObjectIR;
    const cIR = bIR.properties["c"] as ObjectIR;
    const dIR = cIR.properties["d"] as ObjectIR;
    expect(dIR.properties["e"]?.type).toBe("string");
  });

  it("handles array of arrays of objects", () => {
    const schema = z.array(z.array(z.object({ x: z.number() })));
    const ir = extractSchema(schema) as ArrayIR;
    const innerArr = ir.element as ArrayIR;
    const objIR = innerArr.element as ObjectIR;
    expect(objIR.properties["x"]?.type).toBe("number");
  });

  it("handles union with many options", () => {
    const schema = z.union([z.literal("a"), z.literal("b"), z.literal("c"), z.literal("d")]);
    const ir = extractSchema(schema) as UnionIR;
    expect(ir.options).toHaveLength(4);
  });

  it("handles object with all property types", () => {
    const schema = z.object({
      str: z.string(),
      num: z.number(),
      bool: z.boolean(),
      nul: z.null(),
      undef: z.undefined(),
      opt: z.string().optional(),
      nullable: z.string().nullable(),
      arr: z.array(z.string()),
      en: z.enum(["a", "b"]),
      lit: z.literal("x"),
      union: z.union([z.string(), z.number()]),
      nested: z.object({ inner: z.string() }),
    });

    const ir = extractSchema(schema) as ObjectIR;
    expect(ir.properties["str"]?.type).toBe("string");
    expect(ir.properties["num"]?.type).toBe("number");
    expect(ir.properties["bool"]?.type).toBe("boolean");
    expect(ir.properties["nul"]?.type).toBe("null");
    expect(ir.properties["undef"]?.type).toBe("undefined");
    expect(ir.properties["opt"]?.type).toBe("optional");
    expect(ir.properties["nullable"]?.type).toBe("nullable");
    expect(ir.properties["arr"]?.type).toBe("array");
    expect(ir.properties["en"]?.type).toBe("enum");
    expect(ir.properties["lit"]?.type).toBe("literal");
    expect(ir.properties["union"]?.type).toBe("union");
    expect(ir.properties["nested"]?.type).toBe("object");
  });
});

// ─── Tier 2: any / unknown ─────────────────────────────────────────────────

describe("extractSchema — any", () => {
  it("extracts z.any()", () => {
    const ir = extractSchema(z.any());
    expect(ir).toEqual<AnyIR>({ type: "any" });
  });
});

describe("extractSchema — unknown", () => {
  it("extracts z.unknown()", () => {
    const ir = extractSchema(z.unknown());
    expect(ir).toEqual<UnknownIR>({ type: "unknown" });
  });
});

// ─── Tier 2: readonly ──────────────────────────────────────────────────────

describe("extractSchema — readonly", () => {
  it("extracts readonly string", () => {
    const ir = extractSchema(z.string().readonly()) as ReadonlyIR;
    expect(ir.type).toBe("readonly");
    expect(ir.inner.type).toBe("string");
  });

  it("extracts readonly object", () => {
    const ir = extractSchema(z.object({ name: z.string() }).readonly()) as ReadonlyIR;
    expect(ir.type).toBe("readonly");
    expect(ir.inner.type).toBe("object");
  });
});

// ─── Tier 2: date ──────────────────────────────────────────────────────────

describe("extractSchema — date", () => {
  it("extracts plain date", () => {
    const ir = extractSchema(z.date());
    expect(ir).toEqual<DateIR>({ type: "date", checks: [] });
  });

  it("extracts date with min check", () => {
    const minDate = new Date("2020-01-01T00:00:00.000Z");
    const ir = extractSchema(z.date().min(minDate)) as DateIR;
    expect(ir.type).toBe("date");
    expect(ir.checks).toHaveLength(1);
    expect(ir.checks[0]?.kind).toBe("date_greater_than");
    expect(ir.checks[0]).toMatchObject({ inclusive: true });
  });

  it("extracts date with max check", () => {
    const maxDate = new Date("2030-01-01T00:00:00.000Z");
    const ir = extractSchema(z.date().max(maxDate)) as DateIR;
    expect(ir.type).toBe("date");
    expect(ir.checks).toHaveLength(1);
    expect(ir.checks[0]?.kind).toBe("date_less_than");
    expect(ir.checks[0]).toMatchObject({ inclusive: true });
  });

  it("extracts date with both min and max", () => {
    const ir = extractSchema(
      z.date().min(new Date("2020-01-01")).max(new Date("2030-01-01")),
    ) as DateIR;
    expect(ir.checks).toHaveLength(2);
  });
});

// ─── Tier 2: tuple ─────────────────────────────────────────────────────────

describe("extractSchema — tuple", () => {
  it("extracts basic tuple", () => {
    const ir = extractSchema(z.tuple([z.string(), z.number()])) as TupleIR;
    expect(ir.type).toBe("tuple");
    expect(ir.items).toHaveLength(2);
    expect(ir.items[0]?.type).toBe("string");
    expect(ir.items[1]?.type).toBe("number");
    expect(ir.rest).toBeNull();
  });

  it("extracts tuple with rest", () => {
    const ir = extractSchema(z.tuple([z.string()]).rest(z.number())) as TupleIR;
    expect(ir.items).toHaveLength(1);
    expect(ir.items[0]?.type).toBe("string");
    expect(ir.rest).not.toBeNull();
    expect(ir.rest?.type).toBe("number");
  });

  it("extracts empty tuple", () => {
    const ir = extractSchema(z.tuple([])) as TupleIR;
    expect(ir.items).toHaveLength(0);
    expect(ir.rest).toBeNull();
  });
});

// ─── Tier 2: record ────────────────────────────────────────────────────────

describe("extractSchema — record", () => {
  it("extracts string key record", () => {
    const ir = extractSchema(z.record(z.string(), z.number())) as RecordIR;
    expect(ir.type).toBe("record");
    expect(ir.keyType.type).toBe("string");
    expect(ir.valueType.type).toBe("number");
  });

  it("extracts enum key record", () => {
    const ir = extractSchema(z.record(z.enum(["a", "b"]), z.string())) as RecordIR;
    expect(ir.type).toBe("record");
    expect(ir.keyType.type).toBe("enum");
    expect(ir.valueType.type).toBe("string");
  });
});

// ─── Tier 2: default ───────────────────────────────────────────────────────

describe("extractSchema — default", () => {
  it("extracts string with static default", () => {
    const ir = extractSchema(z.string().default("hello")) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.inner.type).toBe("string");
    expect(ir.defaultValue).toBe("hello");
  });

  it("extracts number with static default", () => {
    const ir = extractSchema(z.number().default(42)) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.inner.type).toBe("number");
    expect(ir.defaultValue).toBe(42);
  });

  it("extracts object with static default", () => {
    const ir = extractSchema(z.object({ a: z.string() }).default({ a: "hi" })) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.inner.type).toBe("object");
    expect(ir.defaultValue).toEqual({ a: "hi" });
  });
});

// ─── Tier 2: intersection ──────────────────────────────────────────────────

describe("extractSchema — intersection", () => {
  it("extracts object intersection", () => {
    const ir = extractSchema(
      z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })),
    ) as IntersectionIR;
    expect(ir.type).toBe("intersection");
    expect(ir.left.type).toBe("object");
    expect(ir.right.type).toBe("object");
  });

  it("extracts .and() syntax", () => {
    const ir = extractSchema(
      z.object({ a: z.string() }).and(z.object({ b: z.number() })),
    ) as IntersectionIR;
    expect(ir.type).toBe("intersection");
  });
});

// ─── Tier 2: discriminatedUnion ────────────────────────────────────────────

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
});

// ─── Partial Fallback Collection ─────────────────────────────────────────────

describe("extractSchema — partial fallback (FallbackEntry collection)", () => {
  it("collects fallback entries for object with transform property", () => {
    const schema = z.object({
      name: z.string(),
      slug: z.string().transform((v) => v.toLowerCase()),
    });
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as ObjectIR;

    expect(ir.type).toBe("object");
    expect(ir.properties["name"]?.type).toBe("string");
    expect(ir.properties["slug"]?.type).toBe("fallback");
    expect((ir.properties["slug"] as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks).toHaveLength(1);
    expect(fallbacks[0]?.accessPath).toBe('.shape["slug"]');
  });

  it("collects multiple fallback entries", () => {
    const schema = z.object({
      a: z.string(),
      b: z.string().refine((v) => v.length > 0),
      c: z.number().refine((v) => v > 0),
    });
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as ObjectIR;

    expect(ir.properties["a"]?.type).toBe("string");
    expect((ir.properties["b"] as FallbackIR).fallbackIndex).toBe(0);
    expect((ir.properties["c"] as FallbackIR).fallbackIndex).toBe(1);
    expect(fallbacks).toHaveLength(2);
    expect(fallbacks[0]?.accessPath).toBe('.shape["b"]');
    expect(fallbacks[1]?.accessPath).toBe('.shape["c"]');
  });

  it("collects fallback for array element", () => {
    const schema = z.array(z.string().transform((v) => parseInt(v, 10)));
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as ArrayIR;

    expect(ir.type).toBe("array");
    expect(ir.element.type).toBe("fallback");
    expect((ir.element as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks[0]?.accessPath).toBe("._zod.def.element");
  });

  it("collects fallback for optional inner", () => {
    const schema = z.optional(z.string().transform((v) => v.toUpperCase()));
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks);

    expect(ir.type).toBe("optional");
    expect((ir as OptionalIR).inner.type).toBe("fallback");
    expect(fallbacks[0]?.accessPath).toBe("._zod.def.innerType");
  });

  it("returns no fallbackIndex when called without fallbacks array", () => {
    const schema = z.object({
      name: z.string(),
      slug: z.string().transform((v) => v.toLowerCase()),
    });
    const ir = extractSchema(schema) as ObjectIR;

    expect(ir.properties["slug"]?.type).toBe("fallback");
    expect((ir.properties["slug"] as FallbackIR).fallbackIndex).toBeUndefined();
  });

  it("collects fallback for nullable inner", () => {
    const schema = z.nullable(z.string().transform((v) => v.toUpperCase()));
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as NullableIR;

    expect(ir.type).toBe("nullable");
    expect(ir.inner.type).toBe("fallback");
    expect((ir.inner as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks).toHaveLength(1);
    expect(fallbacks[0]?.accessPath).toBe("._zod.def.innerType");
  });

  it("collects fallback for tuple item", () => {
    const schema = z.tuple([z.string(), z.number().transform((v) => String(v))]);
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as TupleIR;

    expect(ir.type).toBe("tuple");
    expect(ir.items).toHaveLength(2);
    expect(ir.items[0]?.type).toBe("string");
    expect(ir.items[1]?.type).toBe("fallback");
    expect((ir.items[1] as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks[0]?.accessPath).toBe("._zod.def.items[1]");
  });

  it("collects fallback for tuple rest", () => {
    const schema = z.tuple([z.string()]).rest(z.number().transform((v) => String(v)));
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as TupleIR;

    expect(ir.type).toBe("tuple");
    expect(ir.items[0]?.type).toBe("string");
    expect(ir.rest).not.toBeNull();
    expect(ir.rest?.type).toBe("fallback");
    expect((ir.rest as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks[0]?.accessPath).toBe("._zod.def.rest");
  });

  it("collects fallback for record value", () => {
    const schema = z.record(
      z.string(),
      z.string().transform((v) => v.trim()),
    );
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as RecordIR;

    expect(ir.type).toBe("record");
    expect(ir.keyType.type).toBe("string");
    expect(ir.valueType.type).toBe("fallback");
    expect((ir.valueType as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks[0]?.accessPath).toBe("._zod.def.valueType");
  });

  it("collects fallback for union option", () => {
    const schema = z.union([z.string(), z.number().transform((v) => String(v))]);
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as UnionIR;

    expect(ir.type).toBe("union");
    expect(ir.options).toHaveLength(2);
    expect(ir.options[0]?.type).toBe("string");
    expect(ir.options[1]?.type).toBe("fallback");
    expect((ir.options[1] as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks[0]?.accessPath).toBe("._zod.def.options[1]");
  });

  it("collects fallback for discriminatedUnion option property", () => {
    const schema = z.discriminatedUnion("type", [
      z.object({ type: z.literal("a"), value: z.string() }),
      z.object({ type: z.literal("b"), value: z.string().transform((v) => v.trim()) }),
    ]);
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as DiscriminatedUnionIR;

    expect(ir.type).toBe("discriminatedUnion");
    expect(ir.options).toHaveLength(2);
    const opt0 = ir.options[0] as ObjectIR;
    expect(opt0.properties["value"]?.type).toBe("string");
    const opt1 = ir.options[1] as ObjectIR;
    expect(opt1.properties["value"]?.type).toBe("fallback");
    expect(fallbacks).toHaveLength(1);
  });

  it("collects fallback for intersection side", () => {
    const schema = z.intersection(
      z.object({ a: z.string() }),
      z.object({ b: z.string().transform((v) => v.toLowerCase()) }),
    );
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as IntersectionIR;

    expect(ir.type).toBe("intersection");
    expect(ir.left.type).toBe("object");
    const rightObj = ir.right as ObjectIR;
    expect(rightObj.properties["b"]?.type).toBe("fallback");
    expect(fallbacks).toHaveLength(1);
  });

  it("collects fallback for readonly object with transform property", () => {
    const schema = z
      .object({
        name: z.string(),
        slug: z.string().transform((v) => v.toLowerCase()),
      })
      .readonly();
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as ReadonlyIR;

    expect(ir.type).toBe("readonly");
    expect(ir.inner.type).toBe("object");
    const objIR = ir.inner as ObjectIR;
    expect(objIR.properties["slug"]?.type).toBe("fallback");
    expect(fallbacks).toHaveLength(1);
  });

  it("collects fallback for default object with transform property", () => {
    const schema = z
      .object({
        name: z.string(),
        slug: z.string().transform((v) => v.toLowerCase()),
      })
      .default({ name: "test", slug: "test" });
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as DefaultIR;

    expect(ir.type).toBe("default");
    expect(ir.inner.type).toBe("object");
    const objIR = ir.inner as ObjectIR;
    expect(objIR.properties["slug"]?.type).toBe("fallback");
    expect(fallbacks).toHaveLength(1);
  });

  it("collects fallback through deep nesting", () => {
    const schema = z.object({
      items: z.array(
        z.object({
          name: z.string(),
          value: z.string().transform((v) => Number.parseInt(v, 10)),
        }),
      ),
    });
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbacks) as ObjectIR;

    expect(ir.type).toBe("object");
    const itemsIR = ir.properties["items"] as ArrayIR;
    expect(itemsIR.type).toBe("array");
    const elemIR = itemsIR.element as ObjectIR;
    expect(elemIR.type).toBe("object");
    expect(elemIR.properties["name"]?.type).toBe("string");
    expect(elemIR.properties["value"]?.type).toBe("fallback");
    expect((elemIR.properties["value"] as FallbackIR).fallbackIndex).toBe(0);
    expect(fallbacks).toHaveLength(1);
  });

  it("stores the original Zod schema reference in fallback entries", () => {
    const slugSchema = z.string().transform((v) => v.toLowerCase());
    const schema = z.object({ slug: slugSchema });
    const fallbacks: FallbackEntry[] = [];
    extractSchema(schema, fallbacks);

    expect(fallbacks).toHaveLength(1);
    // The stored schema should be the same Zod schema object
    expect(fallbacks[0]?.schema).toBeDefined();
  });
});
