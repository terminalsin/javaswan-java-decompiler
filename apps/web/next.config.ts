import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@blkswn/java-decompiler",
    "@blkswn/java-asm",
    "@blkswn/java-ir",
    "@blkswn/java-analysis",
  ],
  // Turbopack is the default bundler in Next.js 16
  turbopack: {},
  // Webpack fallback config (used when building with --webpack flag)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
