import { config } from "@/config"

export function GET() {
  const body = `User-agent: *
Allow: /
Allow: /pricing
Disallow: /dashboard
Disallow: /sites/
Disallow: /audits/
Disallow: /api/
Disallow: /account

Sitemap: ${config.appUrl}/sitemap.xml
`
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
