import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"

interface Opportunity {
  keyword: string
  position: number
  impressions: number
  clicks: number
  ctr: number
  opportunityScore: number
  reason: string
}

/** GET /api/v1/sites/:id/keyword-opportunities
 *  Returns keywords sorted by optimization potential.
 *  High impressions + position 4–20 = "almost on page 1"
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const metrics = await getKeywordMetricsBySite(id, 200)
  if (metrics.length === 0) {
    return NextResponse.json({ data: { opportunities: [], message: "No keyword data. Connect Google Search Console to see opportunities." } })
  }

  const maxImpressions = Math.max(...metrics.map(m => m.impressions), 1)

  const opportunities: Opportunity[] = metrics
    .filter(m => {
      const pos = parseFloat(m.positionAvg)
      return pos > 3 && pos <= 30 && m.impressions > 10
    })
    .map(m => {
      const pos = parseFloat(m.positionAvg)
      const ctr = parseFloat(m.ctrPct)
      const normalizedPos = pos <= 10 ? 1 : pos <= 20 ? 0.6 : 0.3
      const normalizedImpressions = m.impressions / maxImpressions
      const ctrGap = pos <= 10 ? (0.05 - (ctr / 100)) : (0.02 - (ctr / 100))
      const opportunityScore = Math.round(
        (normalizedPos * 0.4 + normalizedImpressions * 0.4 + Math.max(0, ctrGap) * 0.2) * 100
      )

      let reason = ""
      if (pos <= 5) reason = `Position ${pos.toFixed(1)} — just below top 3, small optimizations can double clicks`
      else if (pos <= 10) reason = `Position ${pos.toFixed(1)} — on page 1 but not in prime spots, content improvement can push higher`
      else if (pos <= 20) reason = `Position ${pos.toFixed(1)} — page 2, targeted content could bring to page 1`
      else reason = `Position ${pos.toFixed(1)} — page 3+, significant content or backlink work needed`

      return {
        keyword: m.keyword,
        position: pos,
        impressions: m.impressions,
        clicks: m.clicks,
        ctr,
        opportunityScore,
        reason,
      }
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 25)

  return NextResponse.json({ data: { opportunities, total: opportunities.length } })
}
