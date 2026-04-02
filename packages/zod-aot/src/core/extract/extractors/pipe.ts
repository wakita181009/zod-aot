import type { SchemaIR } from "../../types.js";
import { tryCompileEffect } from "../effects.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractPipe(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const outDef = def.out?._zod?.def;
  if (outDef && outDef.type === "transform") {
    const source = tryCompileEffect(outDef.transform);
    if (source) {
      const inIR = ctx.visit(def.in, "._zod.def.in");
      return { type: "effect", effectKind: "transform", source, inner: inIR };
    }
    return ctx.fallback("transform");
  }
  const inIR = ctx.visit(def.in, "._zod.def.in");
  const outIR = ctx.visit(def.out, "._zod.def.out");
  return { type: "pipe", in: inIR, out: outIR };
}
