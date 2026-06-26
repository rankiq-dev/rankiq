import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getHealthSummary } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { GetAuditResponse } from "@/lib/types/api"

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

  /* Tenant isolation: verify the audit belongs to a site owned by this user */
  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Audit not found" } }, { status: 404 })
  }

  const summary = await getHealthSummary(id)

  const response: GetAuditResponse = {
    data: {
      audit: {
        id: audit.id,
        siteId: audit.siteId,
        status: audit.status,
        healthScore: audit.healthScore ?? null,
        pagesCount: audit.pagesCount ?? 0,
        startedAt: audit.startedAt?.toISOString() ?? null,
        completedAt: audit.completedAt?.toISOString() ?? null,
        createdAt: audit.createdAt.toISOString(),
        criticalCount: summary.criticalCount,
        warningCount: summary.warningCount,
        infoCount: summary.infoCount,
      },
    },
  }

  return NextResponse.json(response)
}
