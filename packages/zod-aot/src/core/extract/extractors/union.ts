import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef, ZodSchema } from "../types.js";

export function extractUnion(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  if (def.discriminator) {
    const options = def.options.map((opt, i) => ctx.visit(opt, `._zod.def.options[${i}]`));
    const mapping: Record<string, number> = {};
    for (let i = 0; i < def.options.length; i++) {
      const opt = def.options[i] as ZodSchema;
      const optDef = opt._zod.def;
      if (optDef.type === "object" && optDef.shape) {
        const discrimField = optDef.shape[def.discriminator];
        if (discrimField?._zod?.def?.type === "literal") {
          const vals = discrimField._zod.def.values as (string | number | boolean)[];
          for (const v of vals) {
            mapping[String(v)] = i;
          }
        }
      }
    }
    return { type: "discriminatedUnion", discriminator: def.discriminator, options, mapping };
  }
  return {
    type: "union",
    options: def.options.map((opt, i) => ctx.visit(opt, `._zod.def.options[${i}]`)),
  };
}
