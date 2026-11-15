import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema, type RefEntry } from "#src/core/extract/index.js";
import type { SchemaIR } from "#src/core/types.js";
import { zodAtLeast } from "../../../zod-version.js";

function extract(schema: z.ZodType): SchemaIR {
  const refs: RefEntry[] = [];
  return extractSchema(schema, refs);
}

describe("extractOptional", () => {
  it("compiles optional(string)", () => {
    expect(extract(z.string().optional())).toEqual({
      type: "optional",
      inner: { type: "string", checks: [] },
    });
  });

  it("compiles optional(default)", () => {
    const ir = extract(z.string().default("d").optional());
    expect(ir).toMatchObject({ type: "optional", inner: { type: "default" } });
  });

  it("compiles optional(optional(...)) as produced by .partial()", () => {
    const ir = extract(z.string().optional().optional());
    expect(ir).toMatchObject({ type: "optional", inner: { type: "optional" } });
  });

  it.each([
    ["nullable", z.string().default("d").nullable().optional()],
    ["readonly", z.string().default("d").readonly().optional()],
    ["union", z.union([z.string().default("d"), z.number()]).optional()],
    ["pipe", z.string().default("d").pipe(z.string()).optional()],
    ["prefault", z.string().prefault("p").optional()],
  ])("falls back when a wrapped default substitutes undefined (%s)", (_name, schema) => {
    expect(extract(schema).type).toBe("fallback");
  });

  it("falls back for optional(catch) only where Zod runs the catch on undefined", () => {
    const ir = extract(z.string().catch("c").optional());
    expect(ir.type).toBe(zodAtLeast("4.1") ? "optional" : "fallback");
  });

  // The gate reads the schema instance's own version, so overriding it drives
  // both rules regardless of the installed Zod: before 4.5 Zod runs any inner
  // with optin "optional", from 4.5 only one with optin "defaulted".
  it.each([
    [{ major: 4, minor: 4 }, "optional", "fallback"],
    [{ major: 4, minor: 5 }, "optional", "optional"],
    [{ major: 4, minor: 5 }, "defaulted", "fallback"],
    [{ major: 4, minor: 4 }, undefined, "optional"],
    [undefined, "optional", "optional"],
  ] as const)("version %o, inner optin %s → %s", (version, optin, expected) => {
    const inner = z.string().nullable();
    Object.defineProperty(inner._zod, "optin", { value: optin, configurable: true });
    const schema = inner.optional();
    (schema._zod as { version?: unknown }).version = version;
    expect(extract(schema).type).toBe(expected);
  });
});
