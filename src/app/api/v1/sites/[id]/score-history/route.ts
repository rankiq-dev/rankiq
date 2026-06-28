import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/score-history — time series of health scores */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audits = await getAuditsForSite(id)
  const history = audits
    .filter(a => a.status === "complete" && a.healthScore != null && a.completedAt != null)
    .map(a => ({ date: a.completedAt, score: a.healthScore, pagesCount: a.pagesCount }))
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  return NextResponse.json({ siteId: id, domain: site.domain, history })
}
