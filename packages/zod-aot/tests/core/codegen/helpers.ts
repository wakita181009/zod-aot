import type { CodeGenContext } from "#src/core/codegen/context.js";
import { createFastGen, generateFast } from "#src/core/codegen/fast-path.js";
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
      ? new Function("__fb", `${result.code}\nreturn ${result.functionDef};`)
      : new Function(`${result.code}\nreturn ${result.functionDef};`);
  return (fallbackSchemas && fallbackSchemas.length > 0 ? fn(fallbackSchemas) : fn()) as (
    input: unknown,
  ) => {
    success: boolean;
    data?: unknown;
    error?: { issues: unknown[] };
  };
}

/**
 * Helper: compile a fast-check expression from IR and return a boolean function.
 * Returns null if the schema is not eligible for fast-check.
 */
export function compileFastCheck(ir: SchemaIR): ((input: unknown) => boolean) | null {
  const ctx: CodeGenContext = { preamble: [], counter: 0, fnName: "test" };
  const g = createFastGen("input", ctx);
  const expr = generateFast(ir, g);
  if (expr === null) return null;
  if (expr === "true") return () => true;
  if (expr === "false") return () => false;
  const code = [...ctx.preamble, `return function(input){return ${expr};}`].join("\n");
  return new Function(code)() as (input: unknown) => boolean;
}
