/**
 * Shared CompiledSchema<T> IIFE generation.
 * Used by both CLI emitter and unplugin transform.
 */

import type { CompiledSchemaInfo } from "./pipeline.js";

/** Import statement required by generateIIFE output (references __zodAotConfig). */
export const ZOD_CONFIG_IMPORT =
  'import { config as __zodAotConfig, ZodRealError as __ZodError } from "zod";';

/** File-level __msg declaration (must appear once after ZOD_CONFIG_IMPORT). */
export const ZOD_MSG_DECLARATION = "var __msg=__zodAotConfig().localeError;";

function extractFunctionName(functionDef: string): string {
  const match = /^function\s+(\w+)\s*\(/.exec(functionDef);
  if (!match?.[1]) {
    throw new Error("Cannot extract function name from generated code");
  }
  return match[1];
}

/**
 * Generate a `/* @__PURE__ * /` IIFE wrapping a compiled validator.
 *
 * @param schemaExpr - Expression resolving to the original Zod schema
 *   (e.g. `"UserSchema"` in unplugin, `"(__src_X as any).schema"` in CLI)
 * @param schema
 * @param options
 */
export function generateIIFE(
  schemaExpr: string,
  schema: CompiledSchemaInfo,
  options?: { zodCompat?: boolean | undefined },
): string {
  const { codegenResult, fallbackEntries } = schema;
  const fnName = extractFunctionName(codegenResult.functionDef);
  const zodCompat = options?.zodCompat !== false;
  const init = zodCompat ? `Object.create(${schemaExpr})` : "{}";

  return [
    "/* @__PURE__ */ (() => {",
    ...(fallbackEntries.length > 0
      ? [`var __fb=[${fallbackEntries.map((fb) => `${schemaExpr}${fb.accessPath}`).join(",")}];`]
      : []),
    ...codegenResult.code
      .split("\n")
      .filter((l) => l.trim() !== "" && l.trim() !== "/* zod-aot */"),
    codegenResult.functionDef,
    `var __w=${init};`,
    `__w.parse=function(input){const r=${fnName}(input);if(r.success)return r.data;throw r.error;};`,
    `__w.safeParse=${fnName};`,
    `__w.safeParseAsync=function(input){return Promise.resolve(${fnName}(input));};`,
    `__w.parseAsync=function(input){const r=${fnName}(input);if(r.success)return Promise.resolve(r.data);return Promise.reject(r.error);};`,
    `__w.schema=${schemaExpr};`,
    "return __w;",
    "})()",
  ].join("\n");
}
