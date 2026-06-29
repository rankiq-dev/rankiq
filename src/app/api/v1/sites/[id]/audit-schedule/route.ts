import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/audit-schedule — audit cadence and schedule info */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audits = await getAuditsForSite(id)
  const completed = audits
    .filter(a => a.status === "complete" && a.completedAt != null)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

  const latestAudit = completed[0]
  const daysSinceLastAudit = latestAudit?.completedAt
    ? Math.floor((Date.now() - new Date(latestAudit.completedAt).getTime()) / 86400000)
    : null

  // Compute average cadence (days between audits)
  let avgCadenceDays: number | null = null
  if (completed.length >= 2) {
    const gaps: number[] = []
    for (let i = 0; i < completed.length - 1; i++) {
      const gap = Math.floor(
        (new Date(completed[i]!.completedAt!).getTime() - new Date(completed[i + 1]!.completedAt!).getTime()) / 86400000
      )
      if (gap > 0) gaps.push(gap)
    }
    avgCadenceDays = gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null
  }

  const isOverdue = daysSinceLastAudit != null && daysSinceLastAudit > 30
  const needsAudit = daysSinceLastAudit == null || daysSinceLastAudit > 14

  return NextResponse.json({
    data: {
      siteId: id,
      totalAudits: completed.length,
      latestAuditDate: latestAudit?.completedAt?.toISOString() ?? null,
      latestAuditId: latestAudit?.id ?? null,
      daysSinceLastAudit,
      avgCadenceDays,
      isOverdue,
      needsAudit,
      recommendation: needsAudit ? "Run a new audit to refresh SEO data" : `Next audit suggested in ${Math.max(0, 30 - (daysSinceLastAudit ?? 30))} days`,
    },
  })
}
