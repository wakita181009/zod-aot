import { createUnplugin } from "unplugin";
import type { BuildStats } from "./transform.js";
import { log, shouldTransform, transformCode } from "./transform.js";
import type { ZodAotPluginOptions } from "./types.js";

/** Module-level cache shared across plugin instances (e.g. Next.js client + server compilers). */
const transformCache = new Map<string, string>();

/** @internal Exposed for testing only. */
export function _clearTransformCache(): void {
  transformCache.clear();
}

export const unplugin = createUnplugin((options?: ZodAotPluginOptions) => {
  const stats: BuildStats = { files: 0, schemas: 0, optimized: 0, failed: 0 };
  const verbose = options?.verbose === true;

  return {
    name: "zod-aot",
    enforce: "pre" as const,

    transformInclude(id: string): boolean {
      return shouldTransform(id, options);
    },

    async transform(code: string, id: string) {
      const cached = transformCache.get(id);
      if (cached) return { code: cached, map: null };

      const result = await transformCode(code, id, {
        zodCompat: options?.zodCompat,
        verbose,
        autoDiscover: options?.autoDiscover,
        onBuildStats(s) {
          stats.files += s.files;
          stats.schemas += s.schemas;
          stats.optimized += s.optimized;
          stats.failed += s.failed;
        },
      });
      if (!result) return;
      transformCache.set(id, result);
      return { code: result, map: null };
    },

    buildEnd() {
      if (!verbose) return;
      if (stats.schemas === 0) return;
      log(
        `Build summary: ${stats.optimized}/${stats.schemas} schemas optimized across ${stats.files} file(s)` +
          (stats.failed > 0 ? `, ${stats.failed} failed` : ""),
      );
      // Reset for next watch cycle
      stats.files = 0;
      stats.schemas = 0;
      stats.optimized = 0;
      stats.failed = 0;
      transformCache.clear();
    },
  };
});

export type { ZodAotPluginOptions } from "./types.js";
