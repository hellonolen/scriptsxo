import type { NextConfig } from "next";

/**
 * NEXT.JS CONFIGURATION
 * ScriptsXO - Telehealth Prescription Fulfillment Platform
 *
 * Deployment: Cloudflare Pages via @cloudflare/next-on-pages
 * Storage: Cloudflare R2 (scriptsxo-assets bucket)
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // TypeScript and ESLint
  // Build errors are ignored to avoid Convex deep-instantiation TS explosions.
  // We enforce typing separately via `npm run typecheck`.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: process.env.CLOUDFLARE_PAGES === "true",
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [];
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },

  env: {},

  // Disable x-powered-by header
  poweredByHeader: false,

  // Compress responses
  compress: true,
};

export default nextConfig;
