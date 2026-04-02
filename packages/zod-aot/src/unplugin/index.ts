import { createUnplugin } from "unplugin";
import { log, shouldTransform, transformCode } from "./transform.js";
import type { ZodAotPluginOptions } from "./types.js";
import { BuildStatsAccumulator } from "./types.js";

export const unplugin = createUnplugin((options?: ZodAotPluginOptions) => {
  const stats = new BuildStatsAccumulator();
  const cache = new Map<string, string>();
  const verbose = options?.verbose === true;

  return {
    name: "zod-aot",
    enforce: "pre" as const,

    transformInclude(id: string): boolean {
      return shouldTransform(id, options);
    },

    async transform(code: string, id: string) {
      const cached = cache.get(id);
      if (cached) return { code: cached, map: null };

      const result = await transformCode(code, id, {
        zodCompat: options?.zodCompat,
        verbose,
        autoDiscover: options?.autoDiscover,
        onBuildStats(s) {
          stats.add(s);
        },
      });
      if (!result) return;
      cache.set(id, result);
      return { code: result, map: null };
    },

    buildEnd() {
      if (!verbose) return;
      if (stats.schemas === 0) return;
      log(
        `Build summary: ${stats.optimized}/${stats.schemas} schemas optimized across ${stats.files} file(s)` +
          (stats.failed > 0 ? `, ${stats.failed} failed` : ""),
      );
      stats.reset();
      cache.clear();
    },
  };
});

export type { ZodAotPluginOptions } from "./types.js";
