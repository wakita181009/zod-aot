import { hasMutation } from "../../codegen/context.js";
import type { ObjectIR, SchemaIR } from "../../types.js";
import type { Extractor } from "../types.js";

export const extractIntersection: Extractor = (def, ctx) => {
  const left = ctx.visit(def.left, "._zod.def.left");
  const right = ctx.visit(def.right, "._zod.def.right");
  if (!isCompilable(left, right)) return ctx.fallback("unsupported");
  return { type: "intersection", left, right };
};

/**
 * Zod parses both sides against the original input and merges the outputs.
 * Codegen does the same for object & object, merging the two outputs
 * shallowly, which matches Zod's deep merge while no shared key is rewritten
 * (trim, default, transform, a nested object, ...). Any other pair feeds the
 * left output into the right side, so neither side may rewrite anything.
 */
function isCompilable(left: SchemaIR, right: SchemaIR): boolean {
  if (left.type === "object" && right.type === "object") {
    if (!hasPlainUnknownKeys(left) || !hasPlainUnknownKeys(right)) return false;
    return !Object.keys(left.properties).some((key) => {
      const r = right.properties[key];
      const l = left.properties[key];
      return l !== undefined && r !== undefined && (hasMutation(l) || hasMutation(r));
    });
  }
  return !hasMutation(left) && !hasMutation(right);
}

/**
 * Strip and loose sides only. Zod reconciles strict sides' unrecognized keys
 * across the two operands with rules that changed between versions, and a
 * catchall schema may rewrite the extra keys both sides see.
 */
function hasPlainUnknownKeys(ir: ObjectIR): boolean {
  return ir.catchall === undefined || ir.catchall.type === "unknown";
}
