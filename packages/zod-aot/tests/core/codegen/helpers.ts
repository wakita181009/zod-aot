import { generateValidator } from "#src/core/codegen/index.js";
import type { SchemaIR } from "#src/core/types.js";

/**
 * Helper: generate code from IR, compile it, and return the safeParse function.
 */
export function compileIR(
  ir: SchemaIR,
  name = "test",
): (input: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } {
  const result = generateValidator(ir, name);
  const fn = new Function(`${result.code}\nreturn ${result.functionName};`);
  return fn() as (input: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: unknown[] };
  };
}
