import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  logging: {
    fetches: { fullUrl: true },
  },
  serverExternalPackages: [
    "crawlee",
    "@crawlee/cheerio",
    "@crawlee/puppeteer",
    "puppeteer",
    "playwright",
    "undici",
  ],
}

export default nextConfig
