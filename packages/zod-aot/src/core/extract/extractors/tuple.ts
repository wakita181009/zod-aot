import type { SchemaIR, TupleAbsenceIR } from "../../types.js";
import type { ExtractorContext, ZodDef, ZodSchema } from "../types.js";
import { zodAtLeast } from "../zod-version.js";

export function extractTuple(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const items = def.items.map((item, i) => ctx.visit(item, `._zod.def.items[${i}]`));
  const rest = def.rest ? ctx.visit(def.rest, "._zod.def.rest") : null;
  const absence = tupleAbsence(ctx.schema as ZodSchema, def.items);
  return { type: "tuple", items, rest, ...(absence ? { absence } : {}) };
}

/** Index after the last item matching `pred`, or 0. */
function endOfLast(items: ZodSchema[], pred: (item: ZodSchema) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (pred(items[i] as ZodSchema)) return i + 1;
  }
  return 0;
}

/** Mirrors $ZodTuple's parse per Zod version; undefined when every item is required (4.4+). */
function tupleAbsence(schema: ZodSchema, items: ZodSchema[]): TupleAbsenceIR | undefined {
  const current = zodAtLeast(schema, 4, 4);
  if (current === undefined) return undefined;
  const n = items.length;

  if (current) {
    const optinStart = endOfLast(items, (s) => s._zod.optin === undefined);
    const optoutStart = endOfLast(items, (s) => s._zod.optout !== "optional");
    if (optinStart === n && optoutStart === n) return undefined;
    // Zod 4.5 added the rule that an absent optional item ends the output;
    // 4.4 still runs it and keeps the result (a default under .optional()).
    const skips = zodAtLeast(schema, 4, 5) === true;
    return {
      mode: "current",
      optinStart,
      optoutStart,
      skipAbsent: items.map((s) => skips && s._zod.optin === "optional"),
      trimUndefined: items.map((s) => s._zod.optout === "optional"),
    };
  }

  const lastRequired = endOfLast(items, (s) => s._zod.optin !== "optional");
  // Before 4.1.13 Zod computed this as n + 1 when no item is required; then 0.
  const optStart =
    lastRequired === 0 && zodAtLeast(schema, 4, 1, 13) === false ? n + 1 : lastRequired;
  return { mode: "legacy", optStart, tooBigInclusive: zodAtLeast(schema, 4, 3) === true };
}
