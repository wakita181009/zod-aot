import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef, ZodSchema } from "../types.js";

// The concrete discriminant values a single union option matches. zod's discriminatedUnion
// accepts either a `literal` (one or more values) or an `enum` (all its members) as the
// discriminator field. Return null for anything we cannot fully enumerate — the caller then
// degrades to a plain union rather than silently omitting the option from the O(1) switch.
function discriminatorValues(
  field: ZodSchema | undefined,
): (string | number | boolean | null)[] | null {
  const def = field?._zod?.def;
  if (!def) return null;
  if (def.type === "literal") return def.values;
  if (def.type === "enum") return Object.values(def.entries);
  return null;
}

export function extractUnion(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  if (def.discriminator) {
    const mapping: Record<string, number> = {};
    let fullyMapped = true;
    for (let i = 0; i < def.options.length; i++) {
      const optDef = (def.options[i] as ZodSchema)._zod.def;
      const values =
        optDef.type === "object" && optDef.shape
          ? discriminatorValues(optDef.shape[def.discriminator])
          : null;
      // An option whose discriminant we cannot enumerate (e.g. a non-literal/enum field, or a
      // missing discriminator key) would be dropped from the generated switch, producing a
      // validator that wrongly rejects that option's inputs. Fall back to a plain union, which
      // tries every option and is always correct, instead of miscompiling.
      if (!values) {
        fullyMapped = false;
        break;
      }
      for (const v of values) {
        mapping[String(v)] = i;
      }
    }
    if (fullyMapped) {
      const options = def.options.map((opt, i) => ctx.visit(opt, `._zod.def.options[${i}]`));
      return { type: "discriminatedUnion", discriminator: def.discriminator, options, mapping };
    }
  }
  return {
    type: "union",
    options: def.options.map((opt, i) => ctx.visit(opt, `._zod.def.options[${i}]`)),
  };
}
