import type { SchemaIR } from "../types.js";

/**
 * Extract SchemaIR from a Zod schema by traversing its `_zod.def` and `_zod.bag`.
 */
export function extractSchema(_zodSchema: unknown): SchemaIR {
  throw new Error("Not implemented");
}
