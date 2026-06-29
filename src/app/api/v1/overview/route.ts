import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"

/** GET /api/v1/overview — cross-site portfolio summary for the authenticated user */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sites = await getSitesByUser(session.user.id)
  const audits = sites.length > 0
    ? await Promise.all(sites.map(s => getLatestAuditForSite(s.id)))
    : []

  const withScores = audits.filter(a => a?.healthScore != null)
  const avgHealth = withScores.length > 0
    ? Math.round(withScores.reduce((s, a) => s + (a!.healthScore!), 0) / withScores.length)
    : null

  const siteSummaries = sites.map((site, i) => {
    const audit = audits[i]
    return {
      id: site.id,
      domain: site.domain,
      displayName: site.displayName ?? null,
      healthScore: audit?.healthScore ?? null,
      auditStatus: audit?.status ?? null,
      lastAuditDate: audit?.completedAt?.toISOString().slice(0, 10) ?? null,
      pagesCount: audit?.pagesCount ?? null,
      gscConnected: site.gscConnected ?? false,
    }
  })

  const healthySites = siteSummaries.filter(s => (s.healthScore ?? 0) >= 80).length
  const criticalSites = siteSummaries.filter(s => (s.healthScore ?? 100) < 50).length
  const runningSites = siteSummaries.filter(s => s.auditStatus === "running" || s.auditStatus === "queued").length
  const totalPages = siteSummaries.reduce((s, d) => s + (d.pagesCount ?? 0), 0)
  const gscConnected = siteSummaries.filter(s => s.gscConnected).length

  return NextResponse.json({
    data: {
      totalSites: sites.length,
      avgHealthScore: avgHealth,
      healthySites,
      criticalSites,
      runningSites,
      totalPagesCrawled: totalPages,
      gscConnectedSites: gscConnected,
      sites: siteSummaries,
    },
  })
}
