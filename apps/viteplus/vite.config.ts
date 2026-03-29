import { defineConfig } from "vite-plus";
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot()],
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: "main",
    },
    rollupOptions: {
      external: ["zod"],
    },
    outDir: "dist",
  },
});
