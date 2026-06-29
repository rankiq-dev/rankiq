import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordPositionChanges } from "@/db/repositories/gsc"

/** GET /api/v1/sites/:id/keyword-velocity
 *  Distribution of keyword position changes vs previous period
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!site.gscConnected) return NextResponse.json({ data: { connected: false } })

  const keywords = await getKeywordPositionChanges(id, 500)
  const tracked = keywords.filter(k => k.positionChange != null)

  if (tracked.length === 0) {
    return NextResponse.json({ data: { connected: true, tracked: 0, newKeywords: keywords.filter(k => k.prevPosition == null).length, velocity: null } })
  }

  const bigGainers = tracked.filter(k => (k.positionChange ?? 0) <= -5)   // position fell = improvement
  const smallGainers = tracked.filter(k => (k.positionChange ?? 0) < 0 && (k.positionChange ?? 0) > -5)
  const stable = tracked.filter(k => k.positionChange === 0)
  const smallDroppers = tracked.filter(k => (k.positionChange ?? 0) > 0 && (k.positionChange ?? 0) < 5)
  const bigDroppers = tracked.filter(k => (k.positionChange ?? 0) >= 5)

  const avgChange = tracked.reduce((s, k) => s + (k.positionChange ?? 0), 0) / tracked.length
  const netGainers = bigGainers.length + smallGainers.length
  const netDroppers = smallDroppers.length + bigDroppers.length

  return NextResponse.json({
    data: {
      connected: true,
      tracked: tracked.length,
      newKeywords: keywords.filter(k => k.prevPosition == null).length,
      avgPositionChange: parseFloat(avgChange.toFixed(1)),
      trend: avgChange < -1 ? "improving" : avgChange > 1 ? "declining" : "stable",
      velocity: {
        bigGainers: bigGainers.length,
        smallGainers: smallGainers.length,
        stable: stable.length,
        smallDroppers: smallDroppers.length,
        bigDroppers: bigDroppers.length,
      },
      summary: {
        netGainers,
        netDroppers,
        gainRatioPct: tracked.length > 0 ? Math.round(netGainers / tracked.length * 100) : 0,
      },
      topGainers: bigGainers
        .sort((a, b) => (a.positionChange ?? 0) - (b.positionChange ?? 0))
        .slice(0, 5)
        .map(k => ({ keyword: k.keyword, positionChange: k.positionChange, currentPosition: parseFloat(k.positionAvg).toFixed(1) })),
      topDroppers: bigDroppers
        .sort((a, b) => (b.positionChange ?? 0) - (a.positionChange ?? 0))
        .slice(0, 5)
        .map(k => ({ keyword: k.keyword, positionChange: k.positionChange, currentPosition: parseFloat(k.positionAvg).toFixed(1) })),
    },
  })
}
