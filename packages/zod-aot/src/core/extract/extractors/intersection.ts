import type { Extractor } from "../types.js";

export const extractIntersection: Extractor = (def, ctx) => ({
  type: "intersection",
  left: ctx.visit(def.left, "._zod.def.left"),
  right: ctx.visit(def.right, "._zod.def.right"),
});
