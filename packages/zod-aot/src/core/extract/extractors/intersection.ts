import { hasMutation } from "../../codegen/context.js";
import type { SchemaIR } from "../../types.js";
import type { Extractor } from "../types.js";

export const extractIntersection: Extractor = (def, ctx) => {
  const left = ctx.visit(def.left, "._zod.def.left");
  const right = ctx.visit(def.right, "._zod.def.right");
  if (rewritesSharedValue(left, right)) return ctx.fallback("unsupported");
  return { type: "intersection", left, right };
};

/**
 * Zod parses both sides against the original input and merges the outputs,
 * while codegen feeds the left output into the right side. The two agree unless
 * a value seen by both sides is rewritten (trim, default, transform, ...).
 * For object & object only the shared keys matter.
 */
function rewritesSharedValue(left: SchemaIR, right: SchemaIR): boolean {
  if (left.type === "object" && right.type === "object") {
    return Object.keys(left.properties).some((key) => {
      const r = right.properties[key];
      const l = left.properties[key];
      return l !== undefined && r !== undefined && (hasMutation(l) || hasMutation(r));
    });
  }
  return hasMutation(left) || hasMutation(right);
}
