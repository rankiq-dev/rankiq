import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { AuditIssueDto } from "@/lib/types/api"
import type { AuditIssue } from "@/db/schema"

function toDto(issue: AuditIssue): AuditIssueDto {
  return {
    id: issue.id,
    auditId: issue.auditId,
    severity: issue.severity,
    category: issue.category,
    type: issue.type,
    title: issue.title,
    description: issue.description,
    affectedUrls: (issue.affectedUrls as string[]) ?? [],
    affectedCount: issue.affectedCount,
    fixInstructions: issue.fixInstructions ?? null,
    revenueImpactRank: issue.revenueImpactRank ?? null,
    isFixed: issue.isFixed,
    fixedAt: issue.fixedAt?.toISOString() ?? null,
  }
}

/** GET /api/v1/audits/:id/action-plan — returns issues sorted by revenueImpactRank */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Audit not found" } }, { status: 404 })
  }

  /* Tenant isolation */
  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Audit not found" } }, { status: 404 })
  }

  const issues = await getIssuesByAudit(id, { limit: 20 })

  /* Sort by revenueImpactRank ascending (1=best); nulls (not yet ranked) go last */
  const ranked = [...issues].sort((a, b) => {
    if (a.revenueImpactRank == null && b.revenueImpactRank == null) return 0
    if (a.revenueImpactRank == null) return 1
    if (b.revenueImpactRank == null) return -1
    return a.revenueImpactRank - b.revenueImpactRank
  })

  const hasActionPlan = ranked.some((i) => i.revenueImpactRank != null)

  return NextResponse.json({
    data: {
      issues: ranked.map(toDto),
      hasActionPlan,
      auditStatus: audit.status,
    },
  })
}
