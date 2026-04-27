import { createUnplugin } from "unplugin";
import type { CodegenMode } from "#src/core/codegen/context.js";
import { log, shouldTransform, transformCode } from "./transform.js";
import type { ZodAotPluginOptions } from "./types.js";
import { BuildStatsAccumulator } from "./types.js";
import { loadVirtual, resolveVirtualId } from "./virtual.js";

/**
 * Frameworks that route resolveId/load hooks via plugin namespaces, so the
 * `virtual:zod-aot/runtime` import resolves cleanly. webpack and rspack reject
 * the `virtual:` URI scheme at the resolver layer, so we fall back to inline
 * file-level helpers for them (no cross-file dedup, but it builds).
 */
const VIRTUAL_MODULE_FRAMEWORKS = new Set(["vite", "rollup", "rolldown", "esbuild", "farm", "bun"]);

export const unplugin = createUnplugin((options: ZodAotPluginOptions | undefined, meta) => {
  const stats = new BuildStatsAccumulator();
  const cache = new Map<string, string>();
  const verbose = options?.verbose === true;
  const mode: CodegenMode = VIRTUAL_MODULE_FRAMEWORKS.has(meta.framework) ? "lean" : "inline";

  return {
    name: "zod-aot",
    enforce: "pre" as const,

    resolveId(id: string) {
      return resolveVirtualId(id);
    },

    load(id: string) {
      return loadVirtual(id);
    },

    transformInclude(id: string): boolean {
      return shouldTransform(id, options);
    },

    async transform(code: string, id: string) {
      const cached = cache.get(id);
      if (cached) return { code: cached, map: null };

      const result = await transformCode(code, id, {
        mode,
        verbose,
        zodCompat: options?.zodCompat,
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
