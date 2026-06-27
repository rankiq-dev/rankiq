import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit, bulkMarkIssuesFixed } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { listIssuesQuerySchema } from "@/validators/audits"
import type { ListIssuesResponse, AuditIssueDto } from "@/lib/types/api"
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

export async function GET(
  req: NextRequest,
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

  const query = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = listIssuesQuerySchema.safeParse(query)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid query", details: parsed.error.issues } },
      { status: 400 }
    )
  }

  const { severity, limit, offset } = parsed.data
  const issues = await getIssuesByAudit(id, { severity, limit: limit + 1 })

  /* Pagination: fetch limit+1 to know if there's a next page */
  const hasMore = issues.length > limit
  const page = issues.slice(offset, offset + limit)

  const response: ListIssuesResponse = {
    data: {
      issues: page.map(toDto),
      total: hasMore ? offset + limit + 1 : offset + page.length,
      limit,
      offset,
    },
  }

  return NextResponse.json(response)
}

/** PATCH /api/v1/audits/:id/issues — bulk mark issues fixed/unfixed */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { ids?: string[]; fixed?: boolean; all?: boolean }
  const fixed = body.fixed !== false

  let ids: string[] = body.ids ?? []
  if (body.all) {
    const all = await getIssuesByAudit(id, { limit: 1000 })
    ids = all.map(i => i.id)
  }

  if (ids.length === 0) return NextResponse.json({ data: { updated: 0 } })
  const updated = await bulkMarkIssuesFixed(id, ids, fixed)
  return NextResponse.json({ data: { updated } })
}
