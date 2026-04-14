import type { StringBoolIR } from "../../types.js";
import type { ExtractorContext, ZodDef } from "../types.js";

/**
 * Default probe values used to discover truthy/falsy mappings at build time.
 * Covers all Zod v4 stringbool defaults. Custom values outside this set
 * will cause the schema to fall back to Zod.
 */
const PROBE_VALUES = [
  "true",
  "false",
  "1",
  "0",
  "yes",
  "no",
  "on",
  "off",
  "y",
  "n",
  "enabled",
  "disabled",
];

/** Detect whether a pipe def is a Codec with string→boolean (i.e. stringbool). */
export function isStringBoolCodec(def: ZodDef): boolean {
  return (
    typeof def.transform === "function" &&
    typeof def.reverseTransform === "function" &&
    def.in?._zod?.def?.type === "string" &&
    def.out?._zod?.def?.type === "boolean"
  );
}

/**
 * Extract a StringBoolIR by probing the live schema with known test values.
 * Falls back if no truthy/falsy values are discovered.
 */
export function extractStringBool(_def: ZodDef, ctx: ExtractorContext): StringBoolIR | null {
  const schema = ctx.schema as {
    safeParse(input: unknown): { success: boolean; data?: unknown };
  };

  const truthy: string[] = [];
  const falsy: string[] = [];

  for (const val of PROBE_VALUES) {
    try {
      const result = schema.safeParse(val);
      if (result.success) {
        if (result.data === true) truthy.push(val);
        else if (result.data === false) falsy.push(val);
      }
    } catch {
      // Skip values that throw
    }
  }

  // Both sets must be non-empty to generate correct code.
  // If either is empty (e.g. custom values outside probe set), fall back to Zod.
  if (truthy.length === 0 || falsy.length === 0) {
    return null;
  }

  // Detect case sensitivity: find a probed value with case variation and test
  // its opposite-case variant. Values like "1" have no case variation, so we
  // iterate until we find one that does.
  let caseSensitive = false;
  for (const val of truthy) {
    const upper = val.toUpperCase();
    if (upper !== val) {
      try {
        caseSensitive = !schema.safeParse(upper).success;
      } catch {
        // safeParse threw — can't determine, default to case-insensitive
      }
      break;
    }
  }

  return { type: "stringBool", truthy, falsy, caseSensitive };
}
