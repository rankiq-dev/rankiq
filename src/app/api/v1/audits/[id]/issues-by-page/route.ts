import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"

/** GET /api/v1/audits/:id/issues-by-page?limit=50
 *  Issues grouped by affected URL — shows which pages have the most problems
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const limit = Math.min(200, parseInt(req.nextUrl.searchParams.get("limit") ?? "50"))
  const issues = await getIssuesByAudit(id, { limit: 500 })
  const open = issues.filter(i => !i.isFixed)

  // Group by affected URL
  const urlMap = new Map<string, { critical: number; warning: number; info: number; issueTypes: Set<string> }>()
  for (const issue of open) {
    for (const url of (issue.affectedUrls ?? [])) {
      const entry = urlMap.get(url) ?? { critical: 0, warning: 0, info: 0, issueTypes: new Set() }
      entry[issue.severity as "critical" | "warning" | "info"] = (entry[issue.severity as "critical" | "warning" | "info"] ?? 0) + 1
      entry.issueTypes.add(issue.type)
      urlMap.set(url, entry)
    }
  }

  const pages = [...urlMap.entries()]
    .map(([url, counts]) => ({
      url,
      critical: counts.critical,
      warning: counts.warning,
      info: counts.info,
      total: counts.critical + counts.warning + counts.info,
      issueTypes: [...counts.issueTypes],
    }))
    .sort((a, b) => b.critical * 100 + b.warning * 10 + b.info - (a.critical * 100 + a.warning * 10 + a.info))

  return NextResponse.json({
    data: {
      auditId: id,
      totalPagesAffected: pages.length,
      pages: pages.slice(0, limit),
    },
  })
}
