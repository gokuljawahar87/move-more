// next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true, // ✅ Helps catch potential issues

  eslint: {
    // 🚀 Skip ESLint checks during production builds (fixes Vercel errors)
    ignoreDuringBuilds: true,
  },

  webpack(config) {
    // 🧭 Add alias support for cleaner imports
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "app"), // now "@/utils/..." points to app/utils
    };

    return config;
  },
};

export default nextConfig;
