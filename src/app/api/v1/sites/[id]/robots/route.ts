import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"

/** GET /api/v1/sites/:id/robots — check robots.txt and sitemap reachability */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const domain = site.domain
  const base = `https://${domain}`

  async function fetchText(url: string) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "RankIQ-Bot/1.0" },
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      })
      const text = await res.text()
      return { ok: res.ok, status: res.status, text: text.slice(0, 4000) }
    } catch (e) {
      return { ok: false, status: 0, text: "", error: (e as Error).message }
    }
  }

  const [robotsResult, sitemapResult] = await Promise.all([
    fetchText(`${base}/robots.txt`),
    fetchText(`${base}/sitemap.xml`),
  ])

  // Parse robots.txt for common issues
  const robotsIssues: string[] = []
  if (robotsResult.ok && robotsResult.text) {
    if (robotsResult.text.includes("Disallow: /") && !robotsResult.text.includes("User-agent: Googlebot")) {
      robotsIssues.push("Blanket Disallow: / may block all crawlers")
    }
    if (!robotsResult.text.toLowerCase().includes("sitemap:")) {
      robotsIssues.push("No Sitemap: directive found in robots.txt")
    }
  } else if (!robotsResult.ok) {
    robotsIssues.push(`robots.txt returned HTTP ${robotsResult.status || "timeout"}`)
  }

  const sitemapIssues: string[] = []
  if (!sitemapResult.ok) {
    sitemapIssues.push(`sitemap.xml returned HTTP ${sitemapResult.status || "timeout"}`)
  } else if (!sitemapResult.text.includes("<urlset") && !sitemapResult.text.includes("<sitemapindex")) {
    sitemapIssues.push("sitemap.xml does not appear to be a valid XML sitemap")
  }

  return NextResponse.json({
    data: {
      robots: {
        url: `${base}/robots.txt`,
        accessible: robotsResult.ok,
        status: robotsResult.status,
        content: robotsResult.ok ? robotsResult.text : null,
        issues: robotsIssues,
      },
      sitemap: {
        url: `${base}/sitemap.xml`,
        accessible: sitemapResult.ok,
        status: sitemapResult.status,
        issues: sitemapIssues,
      },
    }
  })
}
