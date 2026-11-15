import { describe, expect, it } from "vitest";
import type { CodeGenContext } from "#src/core/codegen/context.js";
import { hasMutation } from "#src/core/codegen/context.js";
import { createFastGen } from "#src/core/codegen/fast-path.js";
import { fastArray, slowArray } from "#src/core/codegen/schemas/array.js";
import { fastNumber, slowNumber } from "#src/core/codegen/schemas/number.js";
import { fastString, slowString } from "#src/core/codegen/schemas/string.js";
import { createSlowGen } from "#src/core/codegen/slow-path.js";
import type { ArrayIR, NumberIR, SchemaIR, StringIR } from "#src/core/types.js";

// The IR types make these states unrepresentable; the runtime guards still have
// to fail loudly if a hand-built or future IR slips through a cast.

function ctx(): CodeGenContext {
  return {
    preamble: [],
    counter: 0,
    fnName: "t",
    regexCache: new Map(),
    mode: "inline",
    usedHelpers: new Set(),
  };
}
const slow = () => createSlowGen("input", "input", "[]", "_e", ctx());
const fast = () => createFastGen("input", ctx());
const unknownCheck = { kind: "not_a_check" } as never;

describe("codegen rejects unknown check kinds", () => {
  const str = { type: "string", checks: [unknownCheck] } as StringIR;
  const num = { type: "number", checks: [unknownCheck] } as NumberIR;
  const arr = { type: "array", element: { type: "any" }, checks: [unknownCheck] } as ArrayIR;

  it.each([
    ["slowString", () => slowString(str, slow())],
    ["fastString", () => fastString(str, fast())],
    ["slowNumber", () => slowNumber(num, slow())],
    ["fastNumber", () => fastNumber(num, fast())],
    ["slowArray", () => slowArray(arr, slow())],
    ["fastArray", () => fastArray(arr, fast())],
  ])("%s throws", (_name, run) => {
    expect(run).toThrow("zod-aot: unhandled case");
  });

  it("fastNumber throws on an unknown number format", () => {
    const ir = {
      type: "number",
      checks: [{ kind: "number_format", format: "float16" }],
    } as unknown as NumberIR;
    expect(() => fastNumber(ir, fast())).toThrow("zod-aot: unhandled case");
  });
});

describe("fastString rejects value-rewriting checks", () => {
  it.each([
    ["coerce", { type: "string", checks: [], coerce: true }],
    [
      "overwrite_effect",
      { type: "string", checks: [{ kind: "overwrite_effect", source: "(s) => s" }] },
    ],
    ["url", { type: "string", checks: [{ kind: "string_format", format: "url" }] }],
  ] as [string, StringIR][])("%s makes the fast path ineligible", (_name, ir) => {
    expect(fastString(ir, fast())).toBeNull();
  });
});

describe("hasMutation", () => {
  const str: SchemaIR = { type: "string", checks: [] };
  const mut: SchemaIR = { type: "string", checks: [], coerce: true };

  const leaves: SchemaIR[] = [
    str,
    { type: "number", checks: [] },
    { type: "boolean" },
    { type: "bigint", checks: [] },
    { type: "date", checks: [] },
    { type: "symbol" },
    { type: "null" },
    { type: "undefined" },
    { type: "void" },
    { type: "nan" },
    { type: "never" },
    { type: "any" },
    { type: "unknown" },
    { type: "literal", values: ["a"] },
    { type: "enum", values: ["a"] },
    { type: "templateLiteral", pattern: "^a$" },
    { type: "file" },
  ];
  it.each(leaves.map((ir) => [ir.type, ir]))("%s without coerce does not mutate", (_t, ir) => {
    expect(hasMutation(ir)).toBe(false);
  });

  it.each([
    ["string coerce", mut],
    ["number coerce", { type: "number", checks: [], coerce: true }],
    [
      "string trim",
      { type: "string", checks: [{ kind: "overwrite_effect", source: "(s) => s.trim()" }] },
    ],
    ["url", { type: "string", checks: [{ kind: "string_format", format: "url" }] }],
    ["default", { type: "default", inner: str, refIndex: 0 }],
    ["catch", { type: "catch", inner: str, defaultValue: "x" }],
    ["effect", { type: "effect", effectKind: "transform", source: "(v) => v", inner: str }],
    ["fallback", { type: "fallback", reason: "unsupported" }],
    ["stringBool", { type: "stringBool", truthy: ["y"], falsy: ["n"], caseSensitive: false }],
    ["recursiveRef", { type: "recursiveRef" }],
    // Objects build a new output (unknown keys dropped or validated) even from pure children.
    ["object of pure children", { type: "object", properties: { a: str } }],
    ["empty object", { type: "object", properties: {} }],
  ] as [string, SchemaIR][])("%s mutates", (_name, ir) => {
    expect(hasMutation(ir)).toBe(true);
  });

  // Each container mutates exactly when one of its children does, in any slot.
  const containers: [string, (child: SchemaIR) => SchemaIR[]][] = [
    ["array", (c) => [{ type: "array", element: c, checks: [] }]],
    [
      "tuple",
      (c) => [
        { type: "tuple", items: [str, c], rest: null },
        { type: "tuple", items: [str], rest: c },
      ],
    ],
    ["record", (c) => [{ type: "record", keyType: str, valueType: c }]],
    ["set", (c) => [{ type: "set", valueType: c }]],
    [
      "map",
      (c) => [
        { type: "map", keyType: c, valueType: str },
        { type: "map", keyType: str, valueType: c },
      ],
    ],
    ["optional", (c) => [{ type: "optional", inner: c }]],
    ["nullable", (c) => [{ type: "nullable", inner: c }]],
    ["readonly", (c) => [{ type: "readonly", inner: c }]],
    ["union", (c) => [{ type: "union", options: [str, c] }]],
    [
      "discriminatedUnion",
      (c) => [{ type: "discriminatedUnion", discriminator: "t", options: [str, c], mapping: {} }],
    ],
    [
      "intersection",
      (c) => [
        { type: "intersection", left: c, right: str },
        { type: "intersection", left: str, right: c },
      ],
    ],
    [
      "pipe",
      (c) => [
        { type: "pipe", in: c, out: str },
        { type: "pipe", in: str, out: c },
      ],
    ],
  ];
  it.each(containers)("%s follows its children", (_name, build) => {
    for (const ir of build(str)) expect(hasMutation(ir)).toBe(false);
    for (const ir of build(mut)) expect(hasMutation(ir)).toBe(true);
  });

  it("throws on an unknown IR type", () => {
    expect(() => hasMutation({ type: "not_a_type" } as never)).toThrow("zod-aot: unhandled case");
  });
});
