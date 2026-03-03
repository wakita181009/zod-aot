import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/tests/**/*.test.ts"],
    benchmark: {
      include: ["benchmarks/**/*.bench.ts"],
    },
  },
});
