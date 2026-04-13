import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Capacitor Android/iOS
  // output: "export",
  trailingSlash: true,

  // next/image optimization is not available in static exports
  images: {
    unoptimized: true,
  },

  experimental: {
    // OneDrive 上でTurbopackのSQLite永続化キャッシュが壊れるため無効化
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
