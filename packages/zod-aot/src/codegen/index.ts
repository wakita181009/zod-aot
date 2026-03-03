import type { SchemaIR } from "../types.js";

export interface CodeGenResult {
  code: string;
  functionName: string;
}

/**
 * Generate optimized validation code from SchemaIR.
 */
export function generateValidator(_ir: SchemaIR, _name: string): CodeGenResult {
  throw new Error("Not implemented");
}
