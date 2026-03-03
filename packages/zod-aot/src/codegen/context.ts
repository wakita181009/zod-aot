import type { SchemaIR } from "../types.js";

export interface CodeGenResult {
  code: string;
  functionName: string;
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
