import { mayAcceptUndefined } from "../../codegen/context.js";
import type { RefineEffectCheckIR, SchemaIR } from "../../types.js";
import { checkedExtractor, mapRefineCheck } from "../checks.js";
import type { ExtractorContext, ZodDef, ZodSchema } from "../types.js";
import { zodAtLeast } from "../zod-version.js";

function extractObject(
  def: ZodDef,
  ctx: ExtractorContext,
  checks: RefineEffectCheckIR[],
): SchemaIR {
  const schema = ctx.schema as ZodSchema;
  const properties: Record<string, SchemaIR> = {};
  const presenceKeys: string[] = [];
  const absentWrittenKeys: string[] = [];
  // Zod 4.4 started rejecting an absent required key (optin unset) even when
  // its schema accepts undefined; earlier versions accept it.
  const checksPresence = zodAtLeast(schema, 4, 4) === true;
  // Zod 4.0 omitted an absent key only for an optional (optin and optout)
  // schema and wrote every other one; 4.1 omits absent keys throughout.
  const writesAbsentKeys = zodAtLeast(schema, 4, 1) === false;
  for (const [key, value] of Object.entries(def.shape)) {
    const prop = ctx.visit(value, `.shape[${JSON.stringify(key)}]`);
    properties[key] = prop;
    // A required key whose schema cannot accept undefined already fails when
    // absent, so it needs no presence check.
    if (checksPresence && value._zod.optin === undefined && mayAcceptUndefined(prop)) {
      presenceKeys.push(key);
    }
    if (
      writesAbsentKeys &&
      !(value._zod.optin === "optional" && value._zod.optout === "optional")
    ) {
      absentWrittenKeys.push(key);
    }
  }
  return {
    type: "object",
    properties,
    ...(presenceKeys.length > 0 ? { presenceKeys } : {}),
    ...(absentWrittenKeys.length > 0 ? { absentWrittenKeys } : {}),
    ...(def.catchall ? { catchall: ctx.visit(def.catchall, "._zod.def.catchall") } : {}),
    ...(checks.length > 0 ? { checks } : {}),
  };
}

/** Objects support only `.refine()`; any other check falls back. */
export const objectExtractor = checkedExtractor(mapRefineCheck, extractObject);
