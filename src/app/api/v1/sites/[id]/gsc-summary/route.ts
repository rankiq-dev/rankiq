import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"

/** GET /api/v1/sites/:id/gsc-summary — Aggregate GSC stats (total clicks, impressions, avg CTR, avg position) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!site.gscConnected) {
    return NextResponse.json({ data: { connected: false, summary: null } })
  }

  const keywords = await getKeywordMetricsBySite(id)
  if (keywords.length === 0) {
    return NextResponse.json({ data: { connected: true, summary: null } })
  }

  const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0)
  const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0)
  const avgPosition = keywords.reduce((s, k) => s + parseFloat(k.positionAvg), 0) / keywords.length
  const avgCtrPct = keywords.reduce((s, k) => s + parseFloat(k.ctrPct), 0) / keywords.length
  const top5 = [...keywords].sort((a, b) => b.clicks - a.clicks).slice(0, 5)

  return NextResponse.json({
    data: {
      connected: true,
      keywordCount: keywords.length,
      summary: {
        totalClicks,
        totalImpressions,
        avgPositionRank: parseFloat(avgPosition.toFixed(2)),
        avgCtrPct: parseFloat(avgCtrPct.toFixed(2)),
        dateRangeStart: keywords[0]?.dateRangeStart,
        dateRangeEnd: keywords[0]?.dateRangeEnd,
      },
      topKeywords: top5.map(k => ({
        keyword: k.keyword,
        clicks: k.clicks,
        impressions: k.impressions,
        positionAvg: parseFloat(k.positionAvg),
        ctrPct: parseFloat(k.ctrPct),
      })),
    },
  })
}
