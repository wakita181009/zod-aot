import type { NextConfig } from "next";
import zodAot from "zod-aot/webpack";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.plugins?.push(zodAot({ autoDiscover: true, verbose: true }));
    return config;
  },
};

export default nextConfig;
