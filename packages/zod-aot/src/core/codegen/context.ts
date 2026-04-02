import type { BigIntCheckIR, CheckIR, CheckOrEffectIR, DateCheckIR, SchemaIR } from "../types.js";

export interface CodeGenResult {
  code: string;
  functionDef: string;
  /** Number of fallback schemas referenced by __fb[N] in the generated code. 0 = no fallbacks. */
  fallbackCount: number;
}

/** Shared mutable state for code generation. Fast and slow paths share the same instance. */
export interface CodeGenContext {
  preamble: string[];
  counter: number;
  fnName: string;
}

// ─── Slow Path context ────────────────────────────────────────────────────────

/** Context object for slow-path (error-collecting) generator functions. */
export interface SlowGen {
  readonly input: string;
  readonly output: string;
  readonly path: string;
  readonly issues: string;
  readonly ctx: CodeGenContext;

  /**
   * Recursively generate validation for a child IR node.
   * All fields are inherited from parent unless overridden.
   * Union generators use `{ issues }` to redirect child errors to temporary arrays.
   * Container generators use `{ input, output, path }` for element traversal.
   */
  visit(
    ir: SchemaIR,
    overrides?: { input?: string; output?: string; path?: string; issues?: string },
  ): string;

  /** Generate a unique temp variable name: `__${prefix}_${counter++}` */
  temp(prefix: string): string;

  /** Add a regex to preamble and return the variable name. */
  regex(prefix: string, pattern: string): string;

  /** Add a Set to preamble and return the variable name. */
  set(prefix: string, values: readonly unknown[]): string;
}

/** Slow-path generator function signature — registered in slowRegistry. */
export type SlowGenerator<T extends SchemaIR = SchemaIR> = (ir: T, g: SlowGen) => string;

// ─── Fast Path context ────────────────────────────────────────────────────────

/** Context object for fast-path (boolean expression) generator functions. */
export interface FastGen {
  readonly input: string;
  readonly ctx: CodeGenContext;

  /**
   * Recursively generate fast-check expression for a child IR node.
   * Returns null if any child is ineligible for fast path.
   */
  visit(ir: SchemaIR, overrides?: { input?: string }): string | null;

  /** Generate a unique temp variable name. */
  temp(prefix: string): string;

  /** Add a regex to preamble and return the variable name. */
  regex(prefix: string, pattern: string): string;
}

/** Fast-path generator function signature — registered in fastRegistry. */
export type FastGenerator<T extends SchemaIR = SchemaIR> = (ir: T, g: FastGen) => string | null;

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
    case "fallback":
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
 * Used by fast-path generators (which never encounter refine_effect).
 */
export function checkPriority(
  a: CheckIR | BigIntCheckIR | DateCheckIR,
  b: CheckIR | BigIntCheckIR | DateCheckIR,
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
