import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;
