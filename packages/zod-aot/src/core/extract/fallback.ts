import type { FallbackIR } from "../types.js";
import type { FallbackEntry } from "./types.js";

export function makeFallback(
  reason: FallbackIR["reason"],
  zodSchema: unknown,
  fallbacks?: FallbackEntry[],
  accessPath?: string,
): FallbackIR {
  if (fallbacks && accessPath !== undefined) {
    const index = fallbacks.length;
    fallbacks.push({ schema: zodSchema, accessPath });
    return { type: "fallback", reason, fallbackIndex: index };
  }
  return { type: "fallback", reason };
}
