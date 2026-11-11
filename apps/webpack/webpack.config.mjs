import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import zodAot from "zod-aot/webpack";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Deliberately the stock webpack + TypeScript setup: extensionless imports and
// no `resolve.extensionAlias`, so CLI output that imports "./schemas.js" is
// exercised against webpack's default resolver.
const ENTRIES = {
  unplugin: { entry: "./src/main.ts", filename: "main.js", plugins: [zodAot({ verbose: true })] },
  cli: { entry: "./src/main-cli.ts", filename: "main-cli.js", plugins: [] },
};

/** @returns {import('webpack').Configuration} */
export default (env) => {
  const target = ENTRIES[env.mode];
  if (!target) throw new Error(`Unknown --env mode=${env.mode} (expected unplugin | cli)`);
  return {
    mode: "production",
    entry: target.entry,
    target: "node",
    output: {
      path: resolve(__dirname, "dist"),
      filename: target.filename,
      module: true,
      chunkFormat: "module",
      library: { type: "module" },
    },
    experiments: { outputModule: true },
    optimization: { minimize: false },
    resolve: { extensions: [".ts", ".js"] },
    module: {
      rules: [{ test: /\.ts$/, loader: "esbuild-loader", exclude: /node_modules/ }],
    },
    plugins: target.plugins,
    externals: { zod: "module zod" },
    externalsType: "module",
  };
};
