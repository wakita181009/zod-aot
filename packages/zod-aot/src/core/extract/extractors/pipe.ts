import type { SchemaIR } from "../../types.js";
import { tryCompileEffect } from "../effects.js";
import type { ExtractorContext, ZodDef } from "../types.js";
import { extractStringBool, isStringBoolCodec } from "./string-bool.js";

export function extractPipe(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  // Detect stringbool Codec (string→boolean with transform + reverseTransform)
  if (isStringBoolCodec(def)) {
    const ir = extractStringBool(def, ctx);
    if (ir) return ir;
    // Probing failed — fall back to Zod
    return ctx.fallback("transform");
  }

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
