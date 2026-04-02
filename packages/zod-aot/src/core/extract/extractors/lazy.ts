import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodSchema } from "../types.js";

export function extractLazy(_def: unknown, ctx: ExtractorContext): SchemaIR {
  const schema = ctx.schema as ZodSchema;
  const innerSchema = schema._zod.innerType;
  if (!innerSchema) {
    return ctx.fallback("lazy");
  }
  // Cycle detection: if we've already visited this resolved schema, emit a recursive ref
  if (ctx.visiting.has(innerSchema)) {
    return { type: "recursiveRef" };
  }
  return ctx.visit(innerSchema, "._zod.innerType");
}
