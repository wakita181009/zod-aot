import { isCompiledSchema } from "#src/core/compile.js";
import type { DiscoveredSchema } from "#src/core/types.js";
import type { LoadOptions } from "./loader.js";
import { loadSourceFile } from "./loader.js";

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
  const targets: Record<string, unknown> = { ...mod };
  const defaultExport = mod["default"];
  if (
    defaultExport != null &&
    typeof defaultExport === "object" &&
    !isCompiledSchema(defaultExport)
  ) {
    Object.assign(targets, defaultExport as Record<string, unknown>);
  }

  for (const [exportName, value] of Object.entries(targets)) {
    if (isCompiledSchema(value)) {
      schemas.push({ exportName, schema: value.schema });
    }
  }

  return schemas;
}
