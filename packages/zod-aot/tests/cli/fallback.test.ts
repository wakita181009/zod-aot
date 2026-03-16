import { describe, expect, it } from "vitest";
import { hasFallback } from "#src/cli/fallback.js";
import type {
  ArrayIR,
  DefaultIR,
  DiscriminatedUnionIR,
  FallbackIR,
  IntersectionIR,
  NullableIR,
  ObjectIR,
  OptionalIR,
  ReadonlyIR,
  RecordIR,
  SchemaIR,
  TupleIR,
  UnionIR,
} from "#src/core/types.js";

describe("hasFallback", () => {
  const stringIR: SchemaIR = { type: "string", checks: [] };
  const numberIR: SchemaIR = { type: "number", checks: [] };
  const fallbackIR: FallbackIR = { type: "fallback", reason: "transform" };

  it("returns null for non-fallback leaf types", () => {
    expect(hasFallback(stringIR)).toBeNull();
    expect(hasFallback(numberIR)).toBeNull();
    expect(hasFallback({ type: "boolean" })).toBeNull();
    expect(hasFallback({ type: "null" })).toBeNull();
    expect(hasFallback({ type: "undefined" })).toBeNull();
    expect(hasFallback({ type: "any" })).toBeNull();
    expect(hasFallback({ type: "unknown" })).toBeNull();
  });

  it("returns reason for fallback IR", () => {
    expect(hasFallback(fallbackIR)).toBe("transform");
    expect(hasFallback({ type: "fallback", reason: "refine" })).toBe("refine");
  });

  it("detects fallback in object properties", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: { name: stringIR, value: fallbackIR },
    };
    expect(hasFallback(ir)).toBe("transform at .value");
  });

  it("returns null for object without fallbacks", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: { name: stringIR, age: numberIR },
    };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in array element", () => {
    const ir: ArrayIR = { type: "array", element: fallbackIR, checks: [] };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for array without fallback", () => {
    const ir: ArrayIR = { type: "array", element: stringIR, checks: [] };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in optional inner", () => {
    const ir: OptionalIR = { type: "optional", inner: fallbackIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for optional without fallback", () => {
    const ir: OptionalIR = { type: "optional", inner: stringIR };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in nullable inner", () => {
    const ir: NullableIR = { type: "nullable", inner: fallbackIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for nullable without fallback", () => {
    const ir: NullableIR = { type: "nullable", inner: stringIR };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in readonly inner", () => {
    const ir: ReadonlyIR = { type: "readonly", inner: fallbackIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for readonly without fallback", () => {
    const ir: ReadonlyIR = { type: "readonly", inner: stringIR };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in default inner", () => {
    const ir: DefaultIR = { type: "default", inner: fallbackIR, defaultValue: "" };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for default without fallback", () => {
    const ir: DefaultIR = { type: "default", inner: stringIR, defaultValue: "" };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in union options", () => {
    const ir: UnionIR = { type: "union", options: [stringIR, fallbackIR] };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for union without fallback", () => {
    const ir: UnionIR = { type: "union", options: [stringIR, numberIR] };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in discriminatedUnion options", () => {
    const ir: DiscriminatedUnionIR = {
      type: "discriminatedUnion",
      discriminator: "type",
      options: [fallbackIR],
      mapping: { a: 0 },
    };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for discriminatedUnion without fallback", () => {
    const ir: DiscriminatedUnionIR = {
      type: "discriminatedUnion",
      discriminator: "type",
      options: [stringIR],
      mapping: { a: 0 },
    };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in tuple items", () => {
    const ir: TupleIR = { type: "tuple", items: [stringIR, fallbackIR], rest: null };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("detects fallback in tuple rest", () => {
    const ir: TupleIR = { type: "tuple", items: [stringIR], rest: fallbackIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for tuple without fallback", () => {
    const ir: TupleIR = { type: "tuple", items: [stringIR, numberIR], rest: null };
    expect(hasFallback(ir)).toBeNull();
  });

  it("returns null for tuple with clean rest", () => {
    const ir: TupleIR = { type: "tuple", items: [stringIR], rest: numberIR };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in record keyType", () => {
    const ir: RecordIR = { type: "record", keyType: fallbackIR, valueType: stringIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("detects fallback in record valueType", () => {
    const ir: RecordIR = { type: "record", keyType: stringIR, valueType: fallbackIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for record without fallback", () => {
    const ir: RecordIR = { type: "record", keyType: stringIR, valueType: numberIR };
    expect(hasFallback(ir)).toBeNull();
  });

  it("detects fallback in intersection left", () => {
    const ir: IntersectionIR = { type: "intersection", left: fallbackIR, right: stringIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("detects fallback in intersection right", () => {
    const ir: IntersectionIR = { type: "intersection", left: stringIR, right: fallbackIR };
    expect(hasFallback(ir)).toBe("transform");
  });

  it("returns null for intersection without fallback", () => {
    const ir: IntersectionIR = { type: "intersection", left: stringIR, right: numberIR };
    expect(hasFallback(ir)).toBeNull();
  });
});
