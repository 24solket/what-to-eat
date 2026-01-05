import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/what-to-eat",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
