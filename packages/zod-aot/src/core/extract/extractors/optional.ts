import type { Extractor } from "../types.js";

export const extractOptional: Extractor = (def, ctx) => ({
  type: "optional",
  inner: ctx.visit(def.innerType, "._zod.def.innerType"),
});
