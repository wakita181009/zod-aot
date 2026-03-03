import { isCompiledSchema } from "../compile.js";
import { loadSourceFile } from "./loader.js";

export interface DiscoveredSchema {
  exportName: string;
  schema: unknown;
}

/**
 * Discover all compile() calls in a source file by importing it and
 * scanning exports for CompiledSchema objects.
 */
export async function discoverSchemas(filePath: string): Promise<DiscoveredSchema[]> {
  const mod = await loadSourceFile(filePath);
  const schemas: DiscoveredSchema[] = [];

  for (const [exportName, value] of Object.entries(mod)) {
    if (isCompiledSchema(value)) {
      schemas.push({ exportName, schema: value.schema });
    }
  }

  return schemas;
}
