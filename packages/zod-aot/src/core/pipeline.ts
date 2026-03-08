import type { CodeGenResult } from "./codegen/context.js";
import { generateValidator } from "./codegen/index.js";
import type { FallbackEntry } from "./extractor.js";
import { extractSchema } from "./extractor.js";

/** Result of compiling a single discovered schema through extract → generate pipeline. */
export interface CompiledSchemaInfo {
  exportName: string;
  codegenResult: CodeGenResult;
  fallbackEntries: FallbackEntry[];
}

/**
 * Run the extract → generate pipeline for each discovered schema.
 * Shared by CLI generate and unplugin transform.
 */
export function compileSchemas(
  schemas: { exportName: string; schema: unknown }[],
): CompiledSchemaInfo[] {
  return schemas.map((s) => {
    const fallbackEntries: FallbackEntry[] = [];
    const ir = extractSchema(s.schema, fallbackEntries);
    const codegenResult = generateValidator(ir, s.exportName, {
      fallbackCount: fallbackEntries.length,
    });
    return { exportName: s.exportName, codegenResult, fallbackEntries };
  });
}
