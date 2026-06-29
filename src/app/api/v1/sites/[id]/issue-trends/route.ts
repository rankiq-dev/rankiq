import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite, getIssuesByAudit } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/issue-trends — how issue counts changed between last two audits */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audits = await getAuditsForSite(id)
  const completed = audits
    .filter(a => a.status === "complete")
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

  if (completed.length < 2) {
    return NextResponse.json({ data: { hasTrend: false, reason: "Need at least 2 completed audits" } })
  }

  const [latest, previous] = [completed[0]!, completed[1]!]
  const [latestIssues, prevIssues] = await Promise.all([
    getIssuesByAudit(latest.id, { limit: 500 }),
    getIssuesByAudit(previous.id, { limit: 500 }),
  ])

  const openLatest = latestIssues.filter(i => !i.isFixed)
  const openPrev = prevIssues.filter(i => !i.isFixed)

  const totalDelta = openLatest.length - openPrev.length
  const criticalDelta = openLatest.filter(i => i.severity === "critical").length - openPrev.filter(i => i.severity === "critical").length
  const warningDelta = openLatest.filter(i => i.severity === "warning").length - openPrev.filter(i => i.severity === "warning").length

  // Issue types by change
  const prevTypes = new Map(openPrev.map(i => [i.type, i.affectedCount ?? 0]))
  const latestTypes = new Map(openLatest.map(i => [i.type, i.affectedCount ?? 0]))
  const allTypes = new Set([...prevTypes.keys(), ...latestTypes.keys()])

  const typeChanges = [...allTypes].map(type => ({
    type,
    prevCount: prevTypes.get(type) ?? 0,
    latestCount: latestTypes.get(type) ?? 0,
    delta: (latestTypes.get(type) ?? 0) - (prevTypes.get(type) ?? 0),
  })).filter(t => t.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return NextResponse.json({
    data: {
      hasTrend: true,
      latestAuditId: latest.id,
      prevAuditId: previous.id,
      latestDate: latest.completedAt?.toISOString().slice(0, 10) ?? null,
      prevDate: previous.completedAt?.toISOString().slice(0, 10) ?? null,
      totals: {
        latest: openLatest.length,
        previous: openPrev.length,
        delta: totalDelta,
        trend: totalDelta < 0 ? "improving" : totalDelta > 0 ? "declining" : "stable",
      },
      bySeverity: {
        critical: { latest: openLatest.filter(i => i.severity === "critical").length, previous: openPrev.filter(i => i.severity === "critical").length, delta: criticalDelta },
        warning: { latest: openLatest.filter(i => i.severity === "warning").length, previous: openPrev.filter(i => i.severity === "warning").length, delta: warningDelta },
      },
      newIssueTypes: typeChanges.filter(t => t.prevCount === 0 && t.latestCount > 0).slice(0, 5).map(t => t.type),
      resolvedIssueTypes: typeChanges.filter(t => t.prevCount > 0 && t.latestCount === 0).slice(0, 5).map(t => t.type),
      topChanges: typeChanges.slice(0, 10),
    },
  })
}
