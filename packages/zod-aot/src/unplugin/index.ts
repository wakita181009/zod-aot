import { createUnplugin, type UnpluginContextMeta } from "unplugin";
import type { CodegenMode } from "#src/core/codegen/context.js";
import { log, shouldTransform, transformCode } from "./transform.js";
import type { ZodAotPluginOptions } from "./types.js";
import { BuildStatsAccumulator } from "./types.js";
import {
  loadVirtual,
  RESOLVED_RUNTIME_ID,
  resolveVirtualId,
  VIRTUAL_RUNTIME_ID,
  WP_RUNTIME_ID,
} from "./virtual.js";

/**
 * Frameworks whose resolveId/load hooks receive any import specifier, including
 * `virtual:` URIs and bare specifiers, so lean-mode cross-file dedup works.
 * webpack / rspack / rsbuild reject the `virtual:` URI scheme but accept bare
 * specifiers, so they use WP_RUNTIME_ID (`__zod-aot-runtime__`) instead of
 * VIRTUAL_RUNTIME_ID.
 */
const VIRTUAL_MODULE_FRAMEWORKS = new Set([
  "vite",
  "rollup",
  "rolldown",
  "esbuild",
  "farm",
  "bun",
  "rspack",
  "webpack",
  "rsbuild",
]);

/**
 * Frameworks that need the bare-specifier runtime ID instead of `virtual:`.
 * rsbuild is included because it wraps the rspack plugin internally, inheriting
 * rspack's rejection of the `virtual:` URI scheme.
 */
const WP_FRAMEWORKS = new Set(["rspack", "webpack", "rsbuild"]);

export const unplugin = createUnplugin(
  (options: ZodAotPluginOptions | undefined, meta: UnpluginContextMeta) => {
    const stats = new BuildStatsAccumulator();
    const cache = new Map<string, string>();
    const verbose = options?.verbose === true;
    const mode: CodegenMode = VIRTUAL_MODULE_FRAMEWORKS.has(meta.framework) ? "lean" : "inline";
    const runtimeId = WP_FRAMEWORKS.has(meta.framework) ? WP_RUNTIME_ID : VIRTUAL_RUNTIME_ID;

    return {
      name: "zod-aot",
      enforce: "pre" as const,

      resolveId(id: string) {
        return resolveVirtualId(id);
      },

      loadInclude(id: string): boolean {
        return id === RESOLVED_RUNTIME_ID;
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
          runtimeId,
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
  },
);

export type { ZodAotPluginOptions } from "./types.js";
