import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"

/** GET /api/v1/agency/benchmark — portfolio benchmark data */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sites = await getSitesByUser(session.user.id)
  if (sites.length === 0) return NextResponse.json({ data: { sites: [], avgScore: null } })

  const siteStats = await Promise.all(sites.map(async site => {
    const audit = await getLatestAuditForSite(site.id)
    if (!audit || audit.status !== "complete") {
      return { siteId: site.id, domain: site.domain, displayName: site.displayName, healthScore: null, criticalCount: 0, warningCount: 0, pagesCount: 0 }
    }
    const issues = await getIssuesByAudit(audit.id, { limit: 100 })
    return {
      siteId: site.id,
      domain: site.domain,
      displayName: site.displayName,
      healthScore: audit.healthScore,
      criticalCount: issues.filter(i => i.severity === "critical").length,
      warningCount: issues.filter(i => i.severity === "warning").length,
      pagesCount: audit.pagesCount ?? 0,
      lastAuditDate: audit.completedAt?.toISOString() ?? null,
    }
  }))

  const scored = siteStats.filter(s => s.healthScore != null)
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, d) => s + (d.healthScore ?? 0), 0) / scored.length) : null

  return NextResponse.json({
    data: {
      sites: siteStats,
      avgScore,
      totalCritical: siteStats.reduce((s, d) => s + d.criticalCount, 0),
      totalSites: sites.length,
      scoredSites: scored.length,
    }
  })
}
