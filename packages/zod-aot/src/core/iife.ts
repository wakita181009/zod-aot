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

/**
 * File-level validator factory (must appear once per compiled file).
 * Wraps a safeParse function into the CompiledSchema interface.
 * schema=null produces a plain object; schema=ZodSchema uses Object.create.
 */
export const MK_VALIDATOR_DECL =
  "function __mkv(fn,schema){var w=schema?Object.create(schema):{};w.parse=function(input){var r=fn(input);if(r.success)return r.data;throw r.error;};w.safeParse=fn;w.safeParseAsync=function(input){return Promise.resolve(fn(input));};w.parseAsync=function(input){var r=fn(input);if(r.success)return Promise.resolve(r.data);return Promise.reject(r.error);};return w;}";

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
  const { codegenResult, refEntries } = schema;
  const fnName = extractFunctionName(codegenResult.functionDef);
  const zodCompat = options?.zodCompat !== false;
  const schemaArg = zodCompat ? schemaExpr : "null";

  return [
    "/* @__PURE__ */ (() => {",
    ...(refEntries.length > 0
      ? [`var __rf=[${refEntries.map((fb) => `${schemaExpr}${fb.accessPath}`).join(",")}];`]
      : []),
    ...codegenResult.code
      .split("\n")
      .filter((l) => l.trim() !== "" && l.trim() !== "/* zod-aot */"),
    codegenResult.functionDef,
    `return __mkv(${fnName},${schemaArg});`,
    "})()",
  ].join("\n");
}
