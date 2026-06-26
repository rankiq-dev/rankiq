import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/health-history — completed audits with health score + date */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Site not found" } }, { status: 404 })
  }

  const audits = await getAuditsForSite(id)
  const history = audits
    .filter((a) => a.status === "complete" && a.healthScore != null)
    .map((a) => ({
      auditId:     a.id,
      healthScore: a.healthScore!,
      pagesCount:  a.pagesCount ?? 0,
      completedAt: a.completedAt?.toISOString() ?? a.createdAt.toISOString(),
    }))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))

  return NextResponse.json({ data: { history, domain: site.domain } })
}
