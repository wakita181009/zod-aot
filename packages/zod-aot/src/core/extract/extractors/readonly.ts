import type { Extractor } from "../types.js";

export const extractReadonly: Extractor = (def, ctx) => ({
  type: "readonly",
  inner: ctx.visit(def.innerType, "._zod.def.innerType"),
});
