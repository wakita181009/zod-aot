import { generateValidator } from "#src/core/codegen/index.js";
import type { SchemaIR } from "#src/core/types.js";

/**
 * Helper: generate code from IR, compile it, and return the safeParse function.
 */
export function compileIR(
  ir: SchemaIR,
  name = "test",
  fallbackSchemas?: unknown[],
): (input: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } {
  const result = generateValidator(ir, name, {
    fallbackCount: fallbackSchemas?.length ?? 0,
  });
  const fn =
    fallbackSchemas && fallbackSchemas.length > 0
      ? new Function("__fb", `${result.code}\nreturn ${result.functionName};`)
      : new Function(`${result.code}\nreturn ${result.functionName};`);
  return (fallbackSchemas && fallbackSchemas.length > 0 ? fn(fallbackSchemas) : fn()) as (
    input: unknown,
  ) => {
    success: boolean;
    data?: unknown;
    error?: { issues: unknown[] };
  };
}
