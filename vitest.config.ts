import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "zod-aot": path.resolve(__dirname, "packages/zod-aot/src/index.ts"),
    },
  },
  test: {
    include: ["packages/*/tests/**/*.test.ts"],
    benchmark: {
      include: ["benchmarks/**/*.bench.ts"],
    },
  },
});
