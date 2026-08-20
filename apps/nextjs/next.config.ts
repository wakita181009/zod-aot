import type { NextConfig } from "next";
import zodAot from "zod-aot/webpack";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.plugins?.push(zodAot({ autoDiscover: true, verbose: true }));
    return config;
  },
  experimental: {
    // TypeScript 7's native compiler no longer ships the typescript.js API
    // Next.js's build-time type checker relies on; this shells out to `tsc` instead.
    useTypeScriptCli: true,
  },
};

export default nextConfig;
