import type { FallbackIR, SchemaIR } from "../types.js";
import { extractChecks } from "./checks.js";
import { extractAny } from "./extractors/any.js";
import { arrayExtractor } from "./extractors/array.js";
import { bigintExtractor } from "./extractors/bigint.js";
import { extractBoolean } from "./extractors/boolean.js";
import { extractCatch } from "./extractors/catch.js";
import { dateExtractor } from "./extractors/date.js";
import { extractDefault } from "./extractors/default.js";
import { extractEnum } from "./extractors/enum.js";
import { fileExtractor } from "./extractors/file.js";
import { extractIntersection } from "./extractors/intersection.js";
import { extractLazy } from "./extractors/lazy.js";
import { extractLiteral } from "./extractors/literal.js";
import { extractMap } from "./extractors/map.js";
import { extractNan } from "./extractors/nan.js";
import { extractNever } from "./extractors/never.js";
import { extractNull } from "./extractors/null.js";
import { extractNullable } from "./extractors/nullable.js";
import { numberExtractor } from "./extractors/number.js";
import { objectExtractor } from "./extractors/object.js";
import { extractOptional } from "./extractors/optional.js";
import { extractPipe } from "./extractors/pipe.js";
import { extractReadonly } from "./extractors/readonly.js";
import { extractRecord } from "./extractors/record.js";
import { setExtractor } from "./extractors/set.js";
import { stringExtractor } from "./extractors/string.js";
import { extractSymbol } from "./extractors/symbol.js";
import { extractTemplateLiteral } from "./extractors/template-literal.js";
import { extractTuple } from "./extractors/tuple.js";
import { extractUndefined } from "./extractors/undefined.js";
import { extractUnion } from "./extractors/union.js";
import { extractUnknown } from "./extractors/unknown.js";
import { extractVoid } from "./extractors/void.js";
import { makeFallback } from "./fallback.js";
import type {
  CheckedExtractor,
  Extractor,
  ExtractorContext,
  RefEntry,
  SupportedZodDefType,
  ZodCheckSchema,
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
  string: stringExtractor,
  number: numberExtractor,
  bigint: bigintExtractor,
  date: dateExtractor,
  object: objectExtractor,
  array: arrayExtractor,
  tuple: extractTuple,
  record: extractRecord,
  set: setExtractor,
  map: extractMap,
  union: extractUnion,
  default: extractDefault,
  pipe: extractPipe,
  lazy: extractLazy,
  catch: extractCatch,
  template_literal: extractTemplateLiteral,
  file: fileExtractor,
} satisfies Record<SupportedZodDefType, Extractor | CheckedExtractor<unknown>>;

// ─── Factory ────────────────────────────────────────────────────────────────
// Lives here (not in types.ts) to avoid circular imports:
// visit() → dispatch() → imports from types.ts

function createExtractorContext(
  schema: unknown,
  path: string,
  refs: RefEntry[] | undefined,
  visiting: Set<unknown>,
): ExtractorContext {
  return {
    schema,
    path,
    refs,
    visiting,
    visit(childSchema: unknown, pathSuffix?: string): SchemaIR {
      const childPath = pathSuffix ? `${path}${pathSuffix}` : path;
      return dispatch(childSchema, childPath, refs, visiting);
    },
    fallback(reason: FallbackIR["reason"]) {
      return makeFallback(reason, schema, refs, path);
    },
  };
}

/**
 * A schema's checks in Zod's run order. Format schemas (z.email(), z.int(),
 * z.int64(), ...) are themselves a check, set on the def, that runs first.
 * A type whose mapper doesn't know that format (e.g. bigint_format) falls back
 * through the mapper's default branch.
 */
function collectChecks(schema: ZodSchema): ZodCheckSchema[] {
  const { def } = schema._zod;
  const chained = def.checks ?? [];
  return def.check ? [schema as unknown as ZodCheckSchema, ...chained] : chained;
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

/**
 * Central dispatch — replaces extractSchemaInner().
 * visit() and dispatch() form a mutually recursive pair, both in this file.
 */
export function dispatch(
  zodSchema: unknown,
  path: string,
  refs: RefEntry[] | undefined,
  visiting: Set<unknown>,
): SchemaIR {
  const schema = zodSchema as ZodSchema;
  const def = schema._zod.def;

  visiting.add(zodSchema);
  try {
    const entry = extractRegistry[def.type as SupportedZodDefType];
    if (!entry) return makeFallback("unsupported", zodSchema, refs, path);
    const ctx = createExtractorContext(zodSchema, path, refs, visiting);
    const checks = collectChecks(schema);
    // `abort: true` makes Zod skip every later check without a `when` guard;
    // codegen only models that for number formats.
    if (def.abort === true || checks.some((c) => c._zod?.def?.abort === true)) {
      return ctx.fallback("unsupported");
    }

    if (typeof entry === "function") {
      if (checks.length === 0) return entry(def, ctx);
      // This type's codegen implements no checks, so any check must fall back.
      const onlyRefines = checks.every((c) => c._zod?.def?.check === "custom");
      return ctx.fallback(onlyRefines ? "refine" : "unsupported");
    }
    const { checkIRs, fallback } = extractChecks(checks, entry.mapCheck);
    if (fallback) return ctx.fallback(fallback);
    return entry.extract(def, ctx, checkIRs);
  } finally {
    visiting.delete(zodSchema);
  }
}
