import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"

/** GET /api/v1/audits/:id/issues/stats — aggregate issue stats */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const issues = await getIssuesByAudit(id, { limit: 500 })

  const bySeverity: Record<string, { total: number; open: number; fixed: number }> = {}
  const byCategory: Record<string, { total: number; open: number; fixed: number }> = {}

  for (const i of issues) {
    if (!bySeverity[i.severity]) bySeverity[i.severity] = { total: 0, open: 0, fixed: 0 }
    bySeverity[i.severity]!.total++
    if (i.isFixed) bySeverity[i.severity]!.fixed++
    else bySeverity[i.severity]!.open++

    if (!byCategory[i.category]) byCategory[i.category] = { total: 0, open: 0, fixed: 0 }
    byCategory[i.category]!.total++
    if (i.isFixed) byCategory[i.category]!.fixed++
    else byCategory[i.category]!.open++
  }

  const total = issues.length
  const fixed = issues.filter(i => i.isFixed).length
  const open = total - fixed

  return NextResponse.json({
    data: {
      auditId: id,
      healthScore: audit.healthScore,
      summary: { total, open, fixed, fixPct: total > 0 ? Math.round(fixed / total * 100) : 0 },
      bySeverity,
      byCategory,
    },
  })
}
