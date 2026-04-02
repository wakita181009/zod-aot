import type { FallbackIR, SchemaIR } from "../types.js";
import { extractAny } from "./extractors/any.js";
import { extractArray } from "./extractors/array.js";
import { extractBigint } from "./extractors/bigint.js";
import { extractBoolean } from "./extractors/boolean.js";
import { extractCatch } from "./extractors/catch.js";
import { extractDate } from "./extractors/date.js";
import { extractDefault } from "./extractors/default.js";
import { extractEnum } from "./extractors/enum.js";
import { extractIntersection } from "./extractors/intersection.js";
import { extractLazy } from "./extractors/lazy.js";
import { extractLiteral } from "./extractors/literal.js";
import { extractMap } from "./extractors/map.js";
import { extractNan } from "./extractors/nan.js";
import { extractNever } from "./extractors/never.js";
import { extractNull } from "./extractors/null.js";
import { extractNullable } from "./extractors/nullable.js";
import { extractNumber } from "./extractors/number.js";
import { extractObject } from "./extractors/object.js";
import { extractOptional } from "./extractors/optional.js";
import { extractPipe } from "./extractors/pipe.js";
import { extractReadonly } from "./extractors/readonly.js";
import { extractRecord } from "./extractors/record.js";
import { extractSet } from "./extractors/set.js";
import { extractString } from "./extractors/string.js";
import { extractSymbol } from "./extractors/symbol.js";
import { extractTemplateLiteral } from "./extractors/template-literal.js";
import { extractTuple } from "./extractors/tuple.js";
import { extractUndefined } from "./extractors/undefined.js";
import { extractUnion } from "./extractors/union.js";
import { extractUnknown } from "./extractors/unknown.js";
import { extractVoid } from "./extractors/void.js";
import { makeFallback } from "./fallback.js";
import type {
  Extractor,
  ExtractorContext,
  FallbackEntry,
  SupportedZodDefType,
  ZodSchema,
} from "./types.js";

// ─── Typed registry ─────────────────────────────────────────────────────────
// Adding a new SupportedZodDefType without registering an extractor here causes
// a compile error, preventing silent-missing-case bugs.
//
// Note: SupportedZodDefType covers Zod's def.type values, not SchemaIR types.
// SchemaIR types like discriminatedUnion, recursiveRef, effect, and fallback are
// produced by extractors (e.g. union emits discriminatedUnion, lazy emits
// recursiveRef) but have no corresponding Zod def.type.

export const extractRegistry = {
  // Primitives (order follows SupportedZodDefType union in types.ts)
  boolean: extractBoolean,
  null: extractNull,
  undefined: extractUndefined,
  any: extractAny,
  unknown: extractUnknown,
  symbol: extractSymbol,
  void: extractVoid,
  nan: extractNan,
  never: extractNever,
  literal: extractLiteral,
  enum: extractEnum,
  optional: extractOptional,
  nullable: extractNullable,
  readonly: extractReadonly,
  intersection: extractIntersection,
  // Complex extractors
  string: extractString,
  number: extractNumber,
  bigint: extractBigint,
  date: extractDate,
  object: extractObject,
  array: extractArray,
  tuple: extractTuple,
  record: extractRecord,
  set: extractSet,
  map: extractMap,
  union: extractUnion,
  default: extractDefault,
  pipe: extractPipe,
  lazy: extractLazy,
  catch: extractCatch,
  template_literal: extractTemplateLiteral,
} satisfies Record<SupportedZodDefType, Extractor>;

// ─── Factory ────────────────────────────────────────────────────────────────
// Lives here (not in types.ts) to avoid circular imports:
// visit() → dispatch() → imports from types.ts

function createExtractorContext(
  schema: unknown,
  path: string,
  fallbacks: FallbackEntry[] | undefined,
  visiting: Set<unknown>,
): ExtractorContext {
  return {
    schema,
    path,
    fallbacks,
    visiting,
    visit(childSchema: unknown, pathSuffix?: string): SchemaIR {
      const childPath = pathSuffix ? `${path}${pathSuffix}` : path;
      return dispatch(childSchema, childPath, fallbacks, visiting);
    },
    fallback(reason: FallbackIR["reason"]) {
      return makeFallback(reason, schema, fallbacks, path);
    },
  };
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

/**
 * Central dispatch — replaces extractSchemaInner().
 * visit() and dispatch() form a mutually recursive pair, both in this file.
 */
export function dispatch(
  zodSchema: unknown,
  path: string,
  fallbacks: FallbackEntry[] | undefined,
  visiting: Set<unknown>,
): SchemaIR {
  const schema = zodSchema as ZodSchema;
  const def = schema._zod.def;

  visiting.add(zodSchema);
  try {
    const extractor = extractRegistry[def.type as SupportedZodDefType];
    const ctx = createExtractorContext(zodSchema, path, fallbacks, visiting);
    return extractor
      ? extractor(def, ctx)
      : makeFallback("unsupported", zodSchema, fallbacks, path);
  } finally {
    visiting.delete(zodSchema);
  }
}
