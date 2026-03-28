import type { CodeGenContext } from "#src/core/codegen/context.js";
import { generateFastCheck } from "#src/core/codegen/fast-check/index.js";
import type { SchemaIR } from "#src/core/types.js";

/**
 * Helper: compile a fast-check expression from IR and return a boolean function.
 * Returns null if the schema is not eligible for fast-check.
 */
export function compileFastCheck(ir: SchemaIR): ((input: unknown) => boolean) | null {
  const ctx: CodeGenContext = { preamble: [], counter: 0, fnName: "test" };
  const expr = generateFastCheck(ir, "input", ctx);
  if (expr === null) return null;
  if (expr === "true") return () => true;
  if (expr === "false") return () => false;
  const code = [...ctx.preamble, `return function(input){return ${expr};}`].join("\n");
  return new Function(code)() as (input: unknown) => boolean;
}
