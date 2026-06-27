import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordPositionChanges } from "@/db/repositories/gsc"

/** GET /api/v1/sites/:id/keyword-drops?threshold=5
 *  Returns keywords that have dropped significantly in position
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

  const threshold = Math.abs(parseInt(req.nextUrl.searchParams.get("threshold") ?? "5"))

  const keywords = await getKeywordPositionChanges(id, 200)

  const drops = keywords
    .filter(k => k.positionChange != null && k.positionChange <= -threshold)
    .sort((a, b) => (a.positionChange ?? 0) - (b.positionChange ?? 0))
    .slice(0, 20)
    .map(k => ({
      keyword: k.query,
      currentPosition: parseFloat(k.position),
      previousPosition: k.prevPosition ? parseFloat(k.prevPosition) : null,
      drop: Math.abs(k.positionChange ?? 0),
      clicks: k.clicks,
      impressions: k.impressions,
      urgency: Math.abs(k.positionChange ?? 0) >= 10 ? "high" : "medium",
    }))

  return NextResponse.json({ data: { drops, threshold, total: drops.length } })
}
