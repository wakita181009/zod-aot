import type { SchemaIR } from "../../types.js";
import { extractChecks } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractArray(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const element = ctx.visit(def.element, "._zod.def.element");
  const { checkIRs } = def.checks ? extractChecks(def.checks) : { checkIRs: [] };
  return { type: "array", element, checks: checkIRs };
}
