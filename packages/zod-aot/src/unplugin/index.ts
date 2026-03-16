import { createUnplugin } from "unplugin";
import { shouldTransform, transformCode } from "./transform.js";
import type { ZodAotPluginOptions } from "./types.js";

export const unplugin = createUnplugin((options?: ZodAotPluginOptions) => ({
  name: "zod-aot",
  enforce: "pre" as const,

  transformInclude(id: string): boolean {
    return shouldTransform(id, options);
  },

  async transform(code: string, id: string) {
    // Quick bail-out before doing any work
    if (!code.includes("zod-aot") || !code.includes("compile")) return;

    const result = await transformCode(code, id, { zodCompat: options?.zodCompat });
    if (!result) return;
    return { code: result, map: null };
  },
}));

export type { ZodAotPluginOptions } from "./types.js";
