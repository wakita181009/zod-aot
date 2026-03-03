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
