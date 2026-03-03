import { isCompiledSchema } from "#src/core/compile.js";
import type { LoadOptions } from "./loader.js";
import { loadSourceFile } from "./loader.js";

export interface DiscoveredSchema {
  exportName: string;
  schema: unknown;
}

/**
 * Discover all compile() calls in a source file by importing it and
 * scanning exports for CompiledSchema objects.
 */
export async function discoverSchemas(
  filePath: string,
  options?: LoadOptions,
): Promise<DiscoveredSchema[]> {
  const mod = await loadSourceFile(filePath, options);
  const schemas: DiscoveredSchema[] = [];

  for (const [exportName, value] of Object.entries(mod)) {
    if (isCompiledSchema(value)) {
      schemas.push({ exportName, schema: value.schema });
    }
  }

  return schemas;
}
