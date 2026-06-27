import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://rankiq.app"
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/terms", "/privacy", "/share/"],
        disallow: ["/api/", "/dashboard", "/sites", "/audits", "/compete", "/agency", "/account", "/login"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
