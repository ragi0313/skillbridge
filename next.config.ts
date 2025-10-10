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
  },
  serverExternalPackages: ['jsonwebtoken', 'ioredis', 'bullmq'],

  // Security: Configure request body size limits
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  },

  // Set body size limits for API routes (handled by middleware)
  serverRuntimeConfig: {
    maxRequestBodySize: '50mb' // Maximum for file uploads
  }
};

export default nextConfig;
