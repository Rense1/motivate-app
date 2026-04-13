import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Capacitor Android/iOS
  output: "export",
  trailingSlash: true,

  // next/image optimization is not available in static exports
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
