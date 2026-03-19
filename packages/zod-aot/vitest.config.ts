import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "../../coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/cli/index.ts"],
    },
    server: {
      deps: {
        inline: ["zod"],
      },
    },
  },
});
