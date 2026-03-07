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

/**
 * Generate `typeof x !== "T"` guard with invalid_type error push.
 * Used by: string, boolean, bigint generators.
 */
export function generateTypeofCheck(
  inputExpr: string,
  expectedType: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `if(typeof ${inputExpr}!=="${expectedType}"){${issuesVar}.push({code:"invalid_type",expected:"${expectedType}",received:typeof ${inputExpr},path:${pathExpr},message:"Expected ${expectedType}"});}`;
}

/**
 * Generate object type guard (not null, not array) with invalid_type error push.
 * Used by: object, record, discriminatedUnion generators.
 */
export function generateObjectCheck(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `if(typeof ${inputExpr}!=="object"||${inputExpr}===null||Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"object",received:Array.isArray(${inputExpr})?"array":${inputExpr}===null?"null":typeof ${inputExpr},path:${pathExpr},message:"Expected object"});}`;
}

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
