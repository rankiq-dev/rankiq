import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"

/** GET /api/v1/sites/:id/traffic-estimate
 *  Estimates monthly organic traffic value from GSC keyword data
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!site.gscConnected) return NextResponse.json({ data: { connected: false, estimate: null } })

  const keywords = await getKeywordMetricsBySite(id)
  if (keywords.length === 0) return NextResponse.json({ data: { connected: true, estimate: null, reason: "No keyword data yet" } })

  const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0)
  const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0
  const page1Keywords = keywords.filter(k => parseFloat(k.positionAvg) <= 10)
  const top3Keywords = keywords.filter(k => parseFloat(k.positionAvg) <= 3)

  // Rough traffic value estimate: assume avg $0.50 CPC equivalent per organic click
  const estimatedCpcValue = 0.5
  const monthlyTrafficValue = Math.round(totalClicks * estimatedCpcValue)

  // Search volume estimate: impressions / max(CTR, 1%) as rough monthly search volume
  const estimatedMonthlySearchVolume = totalClicks > 0 && avgCtr > 0
    ? Math.round(totalImpressions / Math.max(avgCtr / 100, 0.01))
    : totalImpressions

  return NextResponse.json({
    data: {
      connected: true,
      estimate: {
        totalClicks,
        totalImpressions,
        avgCtrPct: parseFloat(avgCtr.toFixed(1)),
        page1Keywords: page1Keywords.length,
        top3Keywords: top3Keywords.length,
        estimatedMonthlySearchVolume,
        monthlyTrafficValue,
        trafficValueCurrency: "USD",
        note: "Traffic value estimated at $0.50/click CPC equivalent. Actual value varies by industry.",
      },
    },
  })
}
