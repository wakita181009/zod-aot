import { defineConfig } from "tsdown";
import zodAot from "zod-aot/rolldown";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  external: ["zod", /^@trpc\//],
  plugins: [zodAot({ autoDiscover: true, verbose: true })],
  outDir: "dist",
});
