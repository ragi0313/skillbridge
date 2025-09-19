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
  turbopack: {
    resolveAlias: {
      // Prevent server-only modules from being bundled in client
      'dns': './lib/utils/client-fallback.js',
      'net': './lib/utils/client-fallback.js',
      'tls': './lib/utils/client-fallback.js',
      'fs': './lib/utils/client-fallback.js',
      'stream': './lib/utils/client-fallback.js',
      'crypto': './lib/utils/client-fallback.js',
      'child_process': './lib/utils/client-fallback.js',
      'cluster': './lib/utils/client-fallback.js',
      'ioredis': './lib/utils/client-fallback.js',
    },
  },
  serverExternalPackages: ['jsonwebtoken', 'ioredis'],
  webpack: (config, { isServer, dev }) => {
    // Completely prevent ioredis and related modules from being bundled in client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        stream: false,
        crypto: false,
        child_process: false,
        cluster: false,
      }

      // Completely exclude ioredis from client bundles
      config.externals = config.externals || []
      config.externals.push({
        ioredis: 'commonjs ioredis',
      })
    }

    // Add module rules to ignore ioredis in client builds
    config.module.rules.push({
      test: /node_modules\/ioredis/,
      use: 'null-loader',
      include: isServer ? undefined : /.*/
    })

    return config
  },
};

export default nextConfig;
