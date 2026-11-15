import type { Extractor, ZodSchema } from "../types.js";

export const extractOptional: Extractor = (def, ctx) => {
  const inner = ctx.visit(def.innerType, "._zod.def.innerType");
  // Codegen runs a direct default on undefined; a nested optional yields
  // undefined either way. Anything else Zod runs on undefined may substitute a
  // value under version-specific rules, so Zod handles it.
  if (
    inner.type !== "default" &&
    inner.type !== "optional" &&
    runsInnerOnUndefined(ctx.schema as ZodSchema, def.innerType)
  ) {
    return ctx.fallback("unsupported");
  }
  return { type: "optional", inner };
};

/**
 * Whether Zod's optional parses `undefined` with its inner schema instead of
 * returning it. Before 4.5 it does so for an inner with optin "optional"
 * (default, prefault, and wrappers around them); from 4.5 only for "defaulted".
 */
function runsInnerOnUndefined(schema: ZodSchema, innerType: ZodSchema): boolean {
  const version = schema._zod.version;
  if (version === undefined) return false;
  const optin = innerType._zod.optin;
  const since45 = version.major > 4 || (version.major === 4 && version.minor >= 5);
  return since45 ? optin === "defaulted" : optin === "optional";
}
