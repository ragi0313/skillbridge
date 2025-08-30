import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**", 
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['agora-rtc-sdk-ng']
  }
};

export default nextConfig;
