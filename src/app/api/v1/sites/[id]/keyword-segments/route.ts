import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"

const INFO_PREFIXES = ["how", "what", "why", "when", "where", "who", "which", "can", "does", "is", "are", "do", "will"]
const TRANSACTIONAL_WORDS = ["buy", "price", "cost", "cheap", "deal", "discount", "order", "purchase", "shop", "sale", "promo", "coupon", "review", "vs", "versus", "compare", "best", "top", "affordable", "hire", "service"]

/** GET /api/v1/sites/:id/keyword-segments
 *  Classify keywords by intent: informational, transactional, navigational
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!site.gscConnected) return NextResponse.json({ data: { connected: false } })

  const keywords = await getKeywordMetricsBySite(id)
  if (keywords.length === 0) return NextResponse.json({ data: { connected: true, segments: null } })

  const domain = site.domain.replace(/^https?:\/\//, "").replace(/\/$/, "").split(".")[0] ?? ""

  const classify = (kw: string): "branded" | "informational" | "transactional" | "navigational" => {
    const lower = kw.toLowerCase()
    const words = lower.split(/\s+/)
    if (domain.length > 2 && lower.includes(domain.toLowerCase())) return "branded"
    const firstWord = words[0] ?? ""
    if (INFO_PREFIXES.includes(firstWord)) return "informational"
    if (words.some(w => TRANSACTIONAL_WORDS.includes(w))) return "transactional"
    if (words.length === 1) return "navigational"
    return "informational"
  }

  const segments = { branded: 0, informational: 0, transactional: 0, navigational: 0 }
  const clicksBySegment = { branded: 0, informational: 0, transactional: 0, navigational: 0 }

  for (const kw of keywords) {
    const seg = classify(kw.keyword)
    segments[seg]++
    clicksBySegment[seg] += kw.clicks
  }

  const total = keywords.length
  const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0)

  return NextResponse.json({
    data: {
      connected: true,
      total,
      segments: Object.entries(segments).map(([segment, count]) => ({
        segment,
        count,
        pct: Math.round(count / total * 100),
        clicks: clicksBySegment[segment as keyof typeof clicksBySegment],
        clicksPct: totalClicks > 0 ? Math.round(clicksBySegment[segment as keyof typeof clicksBySegment] / totalClicks * 100) : 0,
      })).sort((a, b) => b.count - a.count),
    },
  })
}
