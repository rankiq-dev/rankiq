import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
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
