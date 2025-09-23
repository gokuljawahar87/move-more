// next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true, // helps catch potential issues
  swcMinify: true,       // enables SWC-based minification

  webpack(config) {
    // Add alias support
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "app"), // now "@/utils/..." points to app/utils
    };

    return config;
  },
};

export default nextConfig;
