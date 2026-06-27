import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const issues = await getIssuesByAudit(id, { limit: 1000 })

  const payload = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    audit: {
      id: audit.id,
      siteId: audit.siteId,
      domain: site.domain,
      status: audit.status,
      healthScore: audit.healthScore,
      pagesCount: audit.pagesCount,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt,
    },
    summary: {
      total: issues.length,
      critical: issues.filter(i => i.severity === "critical").length,
      warnings: issues.filter(i => i.severity === "warning").length,
      info: issues.filter(i => i.severity === "info").length,
      fixed: issues.filter(i => i.isFixed).length,
    },
    issues: issues.map(i => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      category: i.category,
      title: i.title,
      description: i.description,
      fixInstructions: i.fixInstructions,
      affectedCount: i.affectedCount,
      affectedUrls: i.affectedUrls,
      isFixed: i.isFixed,
      fixedAt: i.fixedAt,
    })),
    pageAnalyses: audit.pageAnalyses ?? [],
  }

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="rankiq-audit-${id}.json"`,
      "Content-Type": "application/json",
    },
  })
}