import type { SchemaIR } from "../../types.js";
import { makeFallback } from "../fallback.js";
import type { FallbackEntry, ZodSchema } from "../types.js";

export function extractTemplateLiteral(
  schema: ZodSchema,
  zodSchema: unknown,
  p: string,
  fallbacks: FallbackEntry[] | undefined,
): SchemaIR {
  const pattern = schema._zod.pattern;
  if (!pattern) return makeFallback("unsupported", zodSchema, fallbacks, p);
  return { type: "templateLiteral", pattern: pattern.source };
}
