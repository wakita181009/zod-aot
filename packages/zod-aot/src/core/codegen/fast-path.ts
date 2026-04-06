/**
 * Fast Path: produces a boolean expression string for eligible schemas.
 * When the expression evaluates to `true` at runtime, the input is valid and
 * safeParse can return success immediately without allocating an issues array.
 *
 * Returns `null` if the schema is not eligible for Fast Path (contains coerce,
 * default, catch, transform, or other non-pure constructs).
 */

import type { SchemaIR } from "../types.js";
import type { CodeGenContext, FastGen, FastGenerator } from "./context.js";
import { escapeString } from "./context.js";
import { fastAny } from "./schemas/any.js";
import { fastArray } from "./schemas/array.js";
import { fastBigInt } from "./schemas/bigint.js";
import { fastBoolean } from "./schemas/boolean.js";
import { fastDate } from "./schemas/date.js";
import { fastDiscriminatedUnion } from "./schemas/discriminated-union.js";
import { fastEnum } from "./schemas/enum.js";
import { fastIntersection } from "./schemas/intersection.js";
import { fastLiteral } from "./schemas/literal.js";
import { fastMap } from "./schemas/map.js";
import { fastNan } from "./schemas/nan.js";
import { fastNever } from "./schemas/never.js";
import { fastNull } from "./schemas/null.js";
import { fastNullable } from "./schemas/nullable.js";
import { fastNumber } from "./schemas/number.js";
import { fastObject } from "./schemas/object.js";
import { fastOptional } from "./schemas/optional.js";
import { fastPipe } from "./schemas/pipe.js";
import { fastReadonly } from "./schemas/readonly.js";
import { fastRecord } from "./schemas/record.js";
import { fastRecursiveRef } from "./schemas/recursive-ref.js";
import { fastSet } from "./schemas/set.js";
import { fastString } from "./schemas/string.js";
import { fastSymbol } from "./schemas/symbol.js";
import { fastTemplateLiteral } from "./schemas/template-literal.js";
import { fastTuple } from "./schemas/tuple.js";
import { fastUndefined } from "./schemas/undefined.js";
import { fastUnion } from "./schemas/union.js";
import { fastUnknown } from "./schemas/unknown.js";
import { fastVoid } from "./schemas/void.js";

// ─── Typed registry ─────────────────────────────────────────────────────────
// `null` = statically ineligible (the type NEVER has a fast path).
// Non-null function = may return null at runtime (dynamically ineligible, e.g. when coerce is present).

const fastRegistry = {
  // Primitives (order follows SchemaIR union in types.ts)
  string: fastString,
  number: fastNumber,
  boolean: fastBoolean,
  bigint: fastBigInt,
  date: fastDate,
  symbol: fastSymbol,
  null: fastNull,
  undefined: fastUndefined,
  void: fastVoid,
  nan: fastNan,
  never: fastNever,
  any: fastAny,
  unknown: fastUnknown,
  literal: fastLiteral,
  enum: fastEnum,
  // Containers
  object: fastObject,
  array: fastArray,
  tuple: fastTuple,
  record: fastRecord,
  set: fastSet,
  map: fastMap,
  // Unions & Intersections
  union: fastUnion,
  discriminatedUnion: fastDiscriminatedUnion,
  intersection: fastIntersection,
  // Modifiers
  optional: fastOptional,
  nullable: fastNullable,
  readonly: fastReadonly,
  default: null, // statically ineligible
  pipe: fastPipe,
  // Effects
  effect: null, // statically ineligible
  // Special
  templateLiteral: fastTemplateLiteral,
  catch: null, // statically ineligible
  fallback: null, // statically ineligible
  recursiveRef: fastRecursiveRef,
} satisfies {
  [K in SchemaIR["type"]]: FastGenerator<Extract<SchemaIR, { type: K }>> | null;
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createFastGen(inputExpr: string, ctx: CodeGenContext): FastGen {
  return {
    input: inputExpr,
    ctx,
    visit(ir, overrides) {
      return generateFast(ir, createFastGen(overrides?.input ?? inputExpr, ctx));
    },
    temp(prefix) {
      return `__${prefix}_${ctx.counter++}`;
    },
    regex(prefix, pattern) {
      const cached = ctx.regexCache.get(pattern);
      if (cached) return cached;
      const name = `__re_${prefix}_${ctx.counter++}`;
      ctx.preamble.push(`var ${name}=new RegExp(${escapeString(pattern)});`);
      ctx.regexCache.set(pattern, name);
      return name;
    },
  };
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

/**
 * Generate a boolean expression string that validates input against the schema.
 * Returns `null` if the schema (or any nested part) is not eligible for fast checking.
 */
export function generateFast(ir: SchemaIR, g: FastGen): string | null {
  const gen = fastRegistry[ir.type];
  if (gen === null) return null;
  // biome-ignore lint/suspicious/noExplicitAny: registry dispatch requires type erasure at call site
  return (gen as any)(ir, g);
}
