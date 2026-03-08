import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    conditions: ["source"],
    alias: {
      "zod-aot/internals": path.resolve(__dirname, "packages/zod-aot/src/internals.ts"),
      "zod-aot": path.resolve(__dirname, "packages/zod-aot/src/index.ts"),
      "#src": path.resolve(__dirname, "packages/zod-aot/src"),
    },
  },
  test: {
    include: ["packages/*/tests/**/*.test.ts"],
    benchmark: {
      include: ["benchmarks/**/*.bench.ts"],
    },
    server: {
      deps: {
        inline: ["zod"],
      },
    },
  },
});
