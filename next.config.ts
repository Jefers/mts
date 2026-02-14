import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Replace 'mts' with your actual repo name
  basePath: "/mts",
};

export default nextConfig;