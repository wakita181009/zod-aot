import { defineConfig } from "vite";
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot()],
  build: {
    lib: {
      entry: "src/app.ts",
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: ["zod"],
    },
    outDir: "dist",
  },
});
