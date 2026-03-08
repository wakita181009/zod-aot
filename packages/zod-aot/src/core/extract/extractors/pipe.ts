import type { SchemaIR } from "../../types.js";
import { makeFallback } from "../fallback.js";
import type { ExtractFn, FallbackEntry, ZodDef } from "../types.js";

export function extractPipe(
  def: ZodDef,
  zodSchema: unknown,
  p: string,
  fallbacks: FallbackEntry[] | undefined,
  recurse: ExtractFn,
  visiting?: Set<unknown>,
): SchemaIR {
  const outDef = def.out?._zod?.def;
  if (outDef && outDef.type === "transform") {
    return makeFallback("transform", zodSchema, fallbacks, p);
  }
  const inIR = recurse(def.in, fallbacks, `${p}._zod.def.in`, visiting);
  const outIR = recurse(def.out, fallbacks, `${p}._zod.def.out`, visiting);
  return { type: "pipe", in: inIR, out: outIR };
}
