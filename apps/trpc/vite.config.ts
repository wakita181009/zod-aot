import { defineConfig } from "vite";
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot({ autoDiscover: true, verbose: true })],
  build: {
    lib: {
      entry: "src/server.ts",
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: ["zod", "@trpc/server", "@trpc/server/adapters/standalone"],
    },
    outDir: "dist",
  },
});
