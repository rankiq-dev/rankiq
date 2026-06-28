import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"

/** GET /api/v1/agency/export — CSV of all sites health scores */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sites = await getSitesByUser(session.user.id)
  const rows = await Promise.all(
    sites.map(async (site) => {
      const audit = await getLatestAuditForSite(site.id)
      const issues = audit ? await getIssuesByAudit(audit.id, { limit: 100 }) : []
      const critical = issues.filter(i => i.severity === "critical").length
      const warnings = issues.filter(i => i.severity === "warning").length
      return {
        domain: site.domain,
        displayName: site.displayName ?? "",
        healthScore: audit?.healthScore ?? "",
        status: audit?.status ?? "no audit",
        pages: audit?.pagesCount ?? 0,
        critical,
        warnings,
        lastAudit: audit?.completedAt ? new Date(audit.completedAt).toISOString().slice(0, 10) : "",
      }
    })
  )

  const headers = ["domain", "display_name", "health_score", "audit_status", "pages", "critical_issues", "warnings", "last_audit_date"]
  const lines = [
    headers.join(","),
    ...rows.map(r => [r.domain, r.displayName, r.healthScore, r.status, r.pages, r.critical, r.warnings, r.lastAudit].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ]

  const csv = lines.join("\n")
  const filename = `rankiq-agency-health-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
