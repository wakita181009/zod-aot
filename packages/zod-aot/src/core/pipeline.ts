import type { CodeGenResult } from "./codegen/context.js";
import { generateValidator } from "./codegen/index.js";
import type { FallbackEntry } from "./extract/index.js";
import { extractSchema } from "./extract/index.js";
import type { DiscoveredSchema } from "./types.js";

/** Result of compiling a single discovered schema through extract → generate pipeline. */
export interface CompiledSchemaInfo {
  exportName: string;
  codegenResult: CodeGenResult;
  fallbackEntries: FallbackEntry[];
}

export interface CompileSchemasOptions {
  /**
   * Called when a single schema fails to compile.
   * When provided, compilation continues with remaining schemas instead of throwing.
   * When not provided, errors propagate as before (throws on first failure).
   */
  onError?: (exportName: string, error: Error) => void;
}

/**
 * Run the extract → generate pipeline for each discovered schema.
 * Shared by CLI generate and unplugin transform.
 */
export function compileSchemas(
  schemas: DiscoveredSchema[],
  options?: CompileSchemasOptions,
): CompiledSchemaInfo[] {
  const results: CompiledSchemaInfo[] = [];

  for (const s of schemas) {
    try {
      const fallbackEntries: FallbackEntry[] = [];
      const ir = extractSchema(s.schema, fallbackEntries);
      const codegenResult = generateValidator(ir, s.exportName, {
        fallbackCount: fallbackEntries.length,
      });
      results.push({ exportName: s.exportName, codegenResult, fallbackEntries });
    } catch (err) {
      if (options?.onError) {
        options.onError(s.exportName, err instanceof Error ? err : new Error(String(err)));
      } else {
        throw err;
      }
    }
  }

  return results;
}
