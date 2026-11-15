import * as path from "node:path";
import { fileURLToPath } from "node:url";
import ttsc from "@ttsc/unplugin/vite";
import { defineConfig } from "vitest/config";
import zodAot from "zod-aot/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [ttsc(), zodAot()],
  resolve: {
    conditions: ["source"],
  },
  test: {
    root: __dirname,
    benchmark: {
      include: ["suites/**/*.bench.ts"],
    },
    server: {
      deps: {
        inline: ["zod", "zod3"],
      },
    },
  },
});
