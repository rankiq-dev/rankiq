import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite, getAuditsForSite } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/status — quick site status: latest score, audit state, trend */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const latest = await getLatestAuditForSite(id)
  const isRunning = latest?.status === "running" || latest?.status === "queued"

  let scoreTrend: number | null = null
  if (latest?.status === "complete") {
    const history = await getAuditsForSite(id, 3)
    const completed = history.filter(a => a.status === "complete" && a.healthScore != null)
    if (completed.length >= 2) {
      scoreTrend = (completed[0]!.healthScore ?? 0) - (completed[1]!.healthScore ?? 0)
    }
  }

  return NextResponse.json({
    data: {
      siteId: id,
      domain: site.domain,
      gscConnected: site.gscConnected,
      auditSchedule: site.auditSchedule,
      latestAudit: latest ? {
        id: latest.id,
        status: latest.status,
        healthScore: latest.healthScore,
        pagesCount: latest.pagesCount,
        completedAt: latest.completedAt?.toISOString() ?? null,
      } : null,
      isRunning,
      scoreTrend,
    },
  })
}
