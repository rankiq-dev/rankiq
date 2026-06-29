import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"

const STOP_WORDS = new Set(["a","the","in","on","at","of","to","for","with","by","from","and","or","is","are","was","be","do","how","what","why","when","where","which","can","does","will","my","your","this","that","these","those","vs"])

/** GET /api/v1/sites/:id/keyword-clusters?limit=20
 *  Group keywords into topic clusters by common 2-word phrases
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!site.gscConnected) return NextResponse.json({ data: { connected: false } })

  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "20"))
  const keywords = await getKeywordMetricsBySite(id)
  if (keywords.length === 0) return NextResponse.json({ data: { connected: true, clusters: [] } })

  // Build topic clusters from common first words (stems)
  const topicMap = new Map<string, { count: number; clicks: number; impressions: number; keywords: string[] }>()

  for (const kw of keywords) {
    const words = kw.keyword.toLowerCase().split(/\s+/).filter(w => !STOP_WORDS.has(w) && w.length > 2)
    const stem = words[0]
    if (!stem) continue
    const entry = topicMap.get(stem) ?? { count: 0, clicks: 0, impressions: 0, keywords: [] }
    entry.count++
    entry.clicks += kw.clicks
    entry.impressions += kw.impressions
    entry.keywords.push(kw.keyword)
    topicMap.set(stem, entry)
  }

  const clusters = [...topicMap.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([topic, v]) => ({
      topic,
      keywordCount: v.count,
      totalClicks: v.clicks,
      totalImpressions: v.impressions,
      topKeywords: v.keywords.slice(0, 5),
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions)
    .slice(0, limit)

  return NextResponse.json({
    data: {
      connected: true,
      totalKeywords: keywords.length,
      clusteredKeywords: clusters.reduce((s, c) => s + c.keywordCount, 0),
      clusters,
    },
  })
}
