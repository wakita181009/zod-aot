import { someNode } from "../../ir-walk.js";
import type { SchemaIR } from "../../types.js";
import { tryCompileEffect } from "../effects.js";
import type { ExtractorContext, ZodDef, ZodSchema } from "../types.js";
import { zodAtLeast } from "../zod-version.js";
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
  const schema = ctx.schema as ZodSchema;
  // Zod 4.0 runs `out` unless `in` aborted, which depends on whether each
  // issue at runtime came from a check (continuable) or a type mismatch.
  if (zodAtLeast(schema, 4, 1) === false && someNode(inIR, mayReportContinuable)) {
    return ctx.fallback("unsupported");
  }
  const passes = zodAtLeast(schema, 4, 5) !== false && someNode(inIR, mayReportUnrecognizedKeys);
  return {
    type: "pipe",
    in: inIR,
    out: outIR,
    ...(passes ? { passesUnrecognizedKeys: true } : {}),
  };
}

function mayReportContinuable(ir: SchemaIR): boolean {
  if (ir.type === "fallback" || ir.type === "recursiveRef") return true;
  return "checks" in ir && ir.checks !== undefined && ir.checks.length > 0;
}

function mayReportUnrecognizedKeys(ir: SchemaIR): boolean {
  if (ir.type === "fallback" || ir.type === "recursiveRef") return true;
  return ir.type === "object" && ir.catchall?.type === "never";
}
