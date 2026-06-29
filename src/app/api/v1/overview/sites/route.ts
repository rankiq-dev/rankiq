import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"

/** GET /api/v1/overview/sites — all sites with latest audit metrics and issue counts */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sites = await getSitesByUser(session.user.id)
  if (sites.length === 0) return NextResponse.json({ data: { sites: [] } })

  const audits = await Promise.all(sites.map(s => getLatestAuditForSite(s.id)))

  const siteData = await Promise.all(
    sites.map(async (site, i) => {
      const audit = audits[i]
      let criticalIssues = 0
      let warningIssues = 0
      if (audit?.id && audit.status === "complete") {
        const issues = await getIssuesByAudit(audit.id, { limit: 200 })
        const open = issues.filter(i => !i.isFixed)
        criticalIssues = open.filter(i => i.severity === "critical").length
        warningIssues = open.filter(i => i.severity === "warning").length
      }
      return {
        id: site.id,
        domain: site.domain,
        displayName: site.displayName ?? null,
        healthScore: audit?.healthScore ?? null,
        auditId: audit?.id ?? null,
        auditStatus: audit?.status ?? null,
        lastAuditDate: audit?.completedAt?.toISOString().slice(0, 10) ?? null,
        pagesCount: audit?.pagesCount ?? null,
        gscConnected: site.gscConnected ?? false,
        issues: {
          critical: criticalIssues,
          warning: warningIssues,
          total: criticalIssues + warningIssues,
        },
      }
    })
  )

  return NextResponse.json({
    data: {
      total: siteData.length,
      sites: siteData.sort((a, b) => (a.healthScore ?? 0) - (b.healthScore ?? 0)),
    },
  })
}
