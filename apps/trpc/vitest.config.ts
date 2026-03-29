import { defineConfig } from "vitest/config";
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot({ autoDiscover: true })],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
