import { createUnplugin } from "unplugin";
import type { BuildStats } from "./transform.js";
import { log, shouldTransform, transformCode } from "./transform.js";
import type { ZodAotPluginOptions } from "./types.js";

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
      const result = await transformCode(code, id, {
        zodCompat: options?.zodCompat,
        verbose,
        onBuildStats(s) {
          stats.files += s.files;
          stats.schemas += s.schemas;
          stats.optimized += s.optimized;
          stats.failed += s.failed;
        },
      });
      if (!result) return;
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
    },
  };
});

export type { ZodAotPluginOptions } from "./types.js";
