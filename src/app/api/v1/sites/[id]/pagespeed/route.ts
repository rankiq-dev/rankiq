import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"

interface PSIMetrics {
  score: number | null
  fcp: number | null   // First Contentful Paint ms
  lcp: number | null   // Largest Contentful Paint ms
  cls: number | null   // Cumulative Layout Shift
  fid: number | null   // Total Blocking Time ms (proxy for FID)
  ttfb: number | null  // Time to First Byte ms
  si: number | null    // Speed Index ms
}

/** GET /api/v1/sites/:id/pagespeed?strategy=mobile|desktop — Google PageSpeed Insights */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const strategy = new URL(req.url).searchParams.get("strategy") === "desktop" ? "desktop" : "mobile"
  const url = `https://${site.domain}/`

  const apiKey = process.env.PAGESPEED_API_KEY
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${apiKey ? `&key=${apiKey}` : ""}&category=performance`

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) return NextResponse.json({ error: `PageSpeed API error: ${res.status}` }, { status: 502 })

    const data = await res.json() as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } }
        audits?: Record<string, { numericValue?: number }>
      }
    }

    const lhr = data.lighthouseResult
    const audits = lhr?.audits ?? {}

    const metrics: PSIMetrics = {
      score: lhr?.categories?.performance?.score != null ? Math.round(lhr.categories.performance.score * 100) : null,
      fcp:   audits["first-contentful-paint"]?.numericValue != null ? Math.round(audits["first-contentful-paint"].numericValue) : null,
      lcp:   audits["largest-contentful-paint"]?.numericValue != null ? Math.round(audits["largest-contentful-paint"].numericValue) : null,
      cls:   audits["cumulative-layout-shift"]?.numericValue != null ? parseFloat((audits["cumulative-layout-shift"].numericValue).toFixed(3)) : null,
      fid:   audits["total-blocking-time"]?.numericValue != null ? Math.round(audits["total-blocking-time"].numericValue) : null,
      ttfb:  audits["server-response-time"]?.numericValue != null ? Math.round(audits["server-response-time"].numericValue) : null,
      si:    audits["speed-index"]?.numericValue != null ? Math.round(audits["speed-index"].numericValue) : null,
    }

    return NextResponse.json({ data: { strategy, url, metrics } })
  } catch (e) {
    return NextResponse.json({ error: `PageSpeed check failed: ${(e as Error).message}` }, { status: 502 })
  }
}
