import type { NextConfig } from "next";
import zodAot from "zod-aot/webpack";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.plugins?.push(zodAot());
    return config;
  },
};

export default nextConfig;
