import type { SchemaIR } from "../types.js";
import { dispatch } from "./registry.js";
import type { FallbackEntry } from "./types.js";

export type { FallbackEntry } from "./types.js";

/**
 * Extract SchemaIR from a Zod schema by traversing its `_zod.def` and `_zod.bag`.
 *
 * When `fallbacks` is provided, non-compilable sub-schemas are collected with their
 * access paths for partial fallback (Zod delegation at runtime).
 */
export function extractSchema(
  zodSchema: unknown,
  fallbacks?: FallbackEntry[],
  currentPath?: string,
  visiting?: Set<unknown>,
): SchemaIR {
  return dispatch(zodSchema, currentPath ?? "", fallbacks, visiting ?? new Set<unknown>());
}
