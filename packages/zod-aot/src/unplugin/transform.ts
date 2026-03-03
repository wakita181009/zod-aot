import { discoverSchemas } from "../cli/discovery.js";
import type { CodeGenResult } from "../codegen/context.js";
import { generateValidator } from "../codegen/index.js";
import { extractSchema } from "../extractor/index.js";
import type { ZodAotPluginOptions } from "./types.js";

interface CompiledSchemaInfo {
  exportName: string;
  codegenResult: CodeGenResult;
}

/**
 * Check if a file should be transformed by the plugin.
 */
export function shouldTransform(id: string, options?: ZodAotPluginOptions): boolean {
  if (!/\.[cm]?[jt]sx?$/.test(id)) return false;
  if (id.includes("node_modules")) return false;
  if (id.endsWith(".d.ts")) return false;
  if (id.endsWith(".compiled.ts") || id.endsWith(".compiled.js")) return false;

  if (options?.exclude?.some((pattern) => id.includes(pattern))) return false;
  if (options?.include && !options.include.some((pattern) => id.includes(pattern))) return false;

  return true;
}

/**
 * Transform source code by replacing compile() calls with optimized validators.
 * Returns the transformed code or null if no transformation was needed.
 */
export async function transformCode(code: string, id: string): Promise<string | null> {
  // Quick check: source must reference both "zod-aot" and "compile"
  if (!code.includes("zod-aot") || !code.includes("compile")) return null;

  // Discover compiled schemas by executing the file (with cache busting for HMR)
  const schemas = await discoverSchemas(id, { cacheBust: true });
  if (schemas.length === 0) return null;

  // For each schema, run the compilation pipeline
  const compiled: CompiledSchemaInfo[] = [];
  for (const s of schemas) {
    const ir = extractSchema(s.schema);
    const result = generateValidator(ir, s.exportName);
    compiled.push({ exportName: s.exportName, codegenResult: result });
  }

  return rewriteSource(code, compiled);
}

/**
 * Extract the function name from a generated function definition.
 * e.g. "function safeParse_User(input){..." -> "safeParse_User"
 */
function extractFunctionName(functionDef: string): string {
  const match = /^function\s+(\w+)\s*\(/.exec(functionDef);
  if (!match?.[1]) {
    throw new Error("Cannot extract function name from generated code");
  }
  return match[1];
}

/**
 * Generate an IIFE that replaces a compile() call with inline optimized code.
 */
function generateInlineReplacement(schemaArgName: string, codegenResult: CodeGenResult): string {
  const fnName = extractFunctionName(codegenResult.functionName);

  // Collect preamble lines (skip empty and marker)
  const preambleLines = codegenResult.code
    .split("\n")
    .filter((l) => l.trim() !== "" && l.trim() !== "/* zod-aot */");
  const preambleStr = preambleLines.length > 0 ? `${preambleLines.join("\n")}\n` : "";

  return [
    "/* @__PURE__ */ (() => {",
    preambleStr + codegenResult.functionName,
    "return {",
    `parse(input){const r=${fnName}(input);if(r.success)return r.data;throw Object.assign(new Error("Validation failed"),r.error);},`,
    `safeParse:${fnName},`,
    `is(input){return ${fnName}(input).success;},`,
    `schema:${schemaArgName},`,
    "};",
    "})()",
  ].join("\n");
}

/**
 * Rewrite source code by replacing compile() calls with IIFE-wrapped optimized validators.
 */
export function rewriteSource(code: string, schemas: CompiledSchemaInfo[]): string {
  let result = code;

  for (const schema of schemas) {
    // Match: <exportName> = compile<...>(schemaArg) or <exportName> = compile(schemaArg)
    // The generic type parameter is optional and may contain nested angle brackets
    const compilePattern = new RegExp(
      `(${schema.exportName}\\s*=\\s*)compile\\s*(?:<[^>]*(?:<[^>]*>[^>]*)?>)?\\s*\\(([^)]+)\\)`,
    );
    const match = compilePattern.exec(result);
    if (!match) continue;

    const schemaArgName = match[2]?.trim() ?? "";
    const prefix = match[1] ?? "";
    const replacement = prefix + generateInlineReplacement(schemaArgName, schema.codegenResult);
    result = result.replace(compilePattern, replacement);
  }

  result = removeCompileImport(result);
  return result;
}

/**
 * Remove the `compile` binding from `import { compile, ... } from "zod-aot"` statements.
 * If `compile` is the only import, the entire import line is removed.
 */
export function removeCompileImport(code: string): string {
  // Match: import { ... } from "zod-aot" or 'zod-aot'
  const importPattern = /import\s*\{([^}]*)\}\s*from\s*["']zod-aot["'];?/g;

  return code.replace(importPattern, (_match, imports: string) => {
    const names = imports
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const remaining = names.filter((n) => n !== "compile");
    if (remaining.length === 0) return "";
    return `import { ${remaining.join(", ")} } from "zod-aot";`;
  });
}
