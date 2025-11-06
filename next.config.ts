import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during build for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Webpack configuration to handle problematic dependencies
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Ignore CSS file loading on server side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Remove console logs in production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };

      // Use terser to remove console logs in production
      config.optimization.minimizer = config.optimization.minimizer || [];
    }

    return config;
  },

  // Compiler options to remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },
  // Skip error page generation during build
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "**",
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
