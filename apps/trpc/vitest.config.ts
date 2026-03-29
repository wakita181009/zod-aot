import { defineConfig } from "vitest/config";
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot()],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
