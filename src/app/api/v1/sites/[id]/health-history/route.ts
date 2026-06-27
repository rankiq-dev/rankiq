import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/health-history?limit=12 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "12"))
  const audits = await getAuditsForSite(id, limit * 2)

  const history = audits
    .filter(a => a.status === "complete" && a.healthScore != null)
    .slice(0, limit)
    .reverse()
    .map(a => ({
      auditId: a.id,
      date: a.completedAt?.toISOString().slice(0, 10) ?? null,
      score: a.healthScore!,
      pagesCount: a.pagesCount ?? null,
    }))

  const trend = history.length >= 2
    ? history[history.length - 1]!.score - history[0]!.score
    : null

  return NextResponse.json({
    data: { siteId: id, domain: site.domain, history, trend, latestScore: history[history.length - 1]?.score ?? null }
  })
}
