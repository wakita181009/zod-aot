import type { BigIntCheckIR, CheckIR, CheckOrEffectIR, DateCheckIR, SchemaIR } from "../types.js";

export interface CodeGenResult {
  code: string;
  functionDef: string;
  /** Number of fallback schemas referenced by __fb[N] in the generated code. 0 = no fallbacks. */
  fallbackCount: number;
  /** Auxiliary function definitions (e.g. __fastCheck_* for recursiveRef). Emitted before the main function. */
  auxiliaryFunctions?: string[];
}

export interface CodeGenContext {
  preamble: string[];
  counter: number;
  fnName: string;
}

export type GenerateValidationFn = (
  ir: SchemaIR,
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
) => string;

export type GenerateFastCheckFn = (
  ir: SchemaIR,
  inputExpr: string,
  ctx: CodeGenContext,
) => string | null;

// Zod v4's email regex pattern (as a source string for new RegExp())
export const EMAIL_REGEX_SOURCE = String.raw`^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`;

/** Fallback UUID regex used when the extractor doesn't provide a pattern (e.g. in unit tests). */
export const UUID_REGEX_SOURCE =
  "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$";

/** Enum values at or below this count use inline === checks instead of Set.has(). */
export const ENUM_INLINE_THRESHOLD = 3;

const CHECK_PRIORITY: Record<string, number> = {
  // Cheapest: length/size comparisons (O(1))
  min_length: 10,
  max_length: 11,
  length_equals: 12,
  min_size: 13,
  max_size: 14,
  // Number format checks (comparison + bitwise)
  number_format: 15,
  // Range comparisons
  greater_than: 20,
  less_than: 21,
  bigint_greater_than: 20,
  bigint_less_than: 21,
  date_greater_than: 22,
  date_less_than: 23,
  // Modulo
  multiple_of: 30,
  bigint_multiple_of: 30,
  // String prefix/suffix (O(prefix/suffix length))
  starts_with: 40,
  ends_with: 41,
  // String search (O(n·m) worst case)
  includes: 42,
  // Regex (most expensive)
  string_format: 50,
};

export function escapeString(s: string): string {
  return JSON.stringify(s);
}

/**
 * Check if a SchemaIR tree contains any value-mutating operations
 * (coerce, default, catch) that would write back to the input expression.
 * Used by container generators to decide whether to shallow-clone.
 */
export function hasMutation(ir: SchemaIR): boolean {
  switch (ir.type) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
    case "date":
      return ir.coerce === true;
    case "default":
    case "catch":
    case "effect":
      return true;
    case "object":
      return Object.values(ir.properties).some(hasMutation);
    case "array":
      return hasMutation(ir.element);
    case "tuple":
      return ir.items.some(hasMutation) || (ir.rest !== null && hasMutation(ir.rest));
    case "record":
      return hasMutation(ir.valueType);
    case "optional":
    case "nullable":
    case "readonly":
      return hasMutation(ir.inner);
    case "union":
    case "discriminatedUnion":
      return ir.options.some(hasMutation);
    case "intersection":
      return hasMutation(ir.left) || hasMutation(ir.right);
    case "pipe":
      return hasMutation(ir.in) || hasMutation(ir.out);
    case "set":
      return hasMutation(ir.valueType);
    case "map":
      return hasMutation(ir.keyType) || hasMutation(ir.valueType);
    default:
      return false;
  }
}

/**
 * Sort comparator for CheckIR: cheapest/most-discriminating checks first.
 * Used by fast-check generators (which never encounter refine_effect).
 */
export function checkPriority(
  a: CheckIR | CheckOrEffectIR | BigIntCheckIR | DateCheckIR,
  b: CheckIR | CheckOrEffectIR | BigIntCheckIR | DateCheckIR,
): number {
  return (CHECK_PRIORITY[a.kind] ?? 99) - (CHECK_PRIORITY[b.kind] ?? 99);
}

/**
 * Sort compilable checks by cost (cheapest first) while preserving
 * the original position of refine_effect entries.
 *
 * Zod preserves insertion order for checks. Compilable checks (typeof, length,
 * regex) are reordered for performance, but refine_effect entries stay at their
 * original index to maintain semantic parity with Zod.
 */
export function sortChecksPreservingEffects<
  T extends CheckIR | CheckOrEffectIR | BigIntCheckIR | DateCheckIR,
>(checks: T[]): T[] {
  const result: T[] = new Array(checks.length);
  const compilable: { check: T; originalIndex: number }[] = [];

  // First pass: place refine_effects at their original positions
  for (let i = 0; i < checks.length; i++) {
    const check = checks[i] as T;
    if (check.kind === "refine_effect") {
      result[i] = check;
    } else {
      compilable.push({ check, originalIndex: i });
    }
  }

  // Sort compilable checks by priority (cheapest first)
  compilable.sort(
    (a, b) => (CHECK_PRIORITY[a.check.kind] ?? 99) - (CHECK_PRIORITY[b.check.kind] ?? 99),
  );

  // Fill remaining slots with sorted compilable checks
  let ci = 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i] === undefined) {
      const entry = compilable[ci++] as (typeof compilable)[number];
      result[i] = entry.check;
    }
  }

  return result;
}
