import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"

/** GET /api/v1/sites/:id/issues?severity=critical&status=open&limit=50
 *  Returns issues from the latest complete audit for a site
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit || audit.status !== "complete") {
    return NextResponse.json({ data: { issues: [], total: 0, auditId: null } })
  }

  const sp = req.nextUrl.searchParams
  const severity = sp.get("severity")
  const status = sp.get("status") // "open" | "fixed"
  const category = sp.get("category")
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"))

  const allIssues = await getIssuesByAudit(audit.id, { limit: 500 })

  let filtered = allIssues
  if (severity) filtered = filtered.filter(i => i.severity === severity)
  if (category) filtered = filtered.filter(i => i.category === category)
  if (status === "open") filtered = filtered.filter(i => !i.isFixed)
  else if (status === "fixed") filtered = filtered.filter(i => i.isFixed)

  const paginated = filtered.slice(0, limit)

  return NextResponse.json({
    data: {
      auditId: audit.id,
      auditedAt: audit.completedAt?.toISOString(),
      total: filtered.length,
      issues: paginated.map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        category: i.category,
        title: i.title,
        description: i.description,
        affectedCount: i.affectedCount,
        affectedUrls: i.affectedUrls,
        isFixed: i.isFixed,
        fixedAt: i.fixedAt?.toISOString() ?? null,
      })),
    },
  })
}
