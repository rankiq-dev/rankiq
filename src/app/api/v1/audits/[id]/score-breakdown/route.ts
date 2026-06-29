import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"

/** GET /api/v1/audits/:id/score-breakdown
 *  Issues grouped by category with severity breakdown — shows what's hurting the score
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const issues = await getIssuesByAudit(id, { limit: 500 })
  const open = issues.filter(i => !i.isFixed)
  const fixed = issues.filter(i => i.isFixed)

  const byCategory = new Map<string, { critical: number; warning: number; info: number; total: number }>()
  for (const issue of open) {
    const cat = issue.category ?? "other"
    const entry = byCategory.get(cat) ?? { critical: 0, warning: 0, info: 0, total: 0 }
    entry[issue.severity as "critical" | "warning" | "info"] = (entry[issue.severity as "critical" | "warning" | "info"] ?? 0) + 1
    entry.total++
    byCategory.set(cat, entry)
  }

  const categories = [...byCategory.entries()]
    .map(([category, counts]) => ({ category, ...counts }))
    .sort((a, b) => b.critical * 10 + b.warning - (a.critical * 10 + a.warning))

  return NextResponse.json({
    data: {
      auditId: id,
      healthScore: audit.healthScore,
      status: audit.status,
      totalIssues: issues.length,
      openIssues: open.length,
      fixedIssues: fixed.length,
      criticalCount: open.filter(i => i.severity === "critical").length,
      warningCount: open.filter(i => i.severity === "warning").length,
      infoCount: open.filter(i => i.severity === "info").length,
      byCategory: categories,
    },
  })
}
