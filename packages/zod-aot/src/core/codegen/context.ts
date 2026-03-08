import type { SchemaIR } from "../types.js";

export interface CodeGenResult {
  code: string;
  functionName: string;
  /** Number of fallback schemas referenced by __fb[N] in the generated code. 0 = no fallbacks. */
  fallbackCount: number;
}

export interface CodeGenContext {
  preamble: string[];
  counter: number;
}

export type GenerateValidationFn = (
  ir: SchemaIR,
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
) => string;

// Zod v4's email regex pattern (as a source string for new RegExp())
export const EMAIL_REGEX_SOURCE = String.raw`^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`;

/** Fallback UUID regex used when the extractor doesn't provide a pattern (e.g. in unit tests). */
export const UUID_REGEX_SOURCE =
  "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$";

/**
 * Tagged template literal that strips newlines and leading whitespace.
 * Allows writing generated code with readable indentation while producing minified output.
 */
export function emit(
  strings: TemplateStringsArray,
  ...values: (string | number | bigint | boolean)[]
): string {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += (strings[i] ?? "").replace(/\n\s*/g, "");
    if (i < values.length) result += String(values[i]);
  }
  return result;
}

export function escapeString(s: string): string {
  return JSON.stringify(s);
}

/**
 * Extract the function name from a generated function definition string.
 * e.g. "function safeParse_User(input){..." -> "safeParse_User"
 */
export function extractFunctionName(functionDef: string): string {
  const match = /^function\s+(\w+)\s*\(/.exec(functionDef);
  if (!match?.[1]) {
    throw new Error("Cannot extract function name from generated code");
  }
  return match[1];
}
