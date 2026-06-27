import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"

/** GET /api/v1/agency/compare?a=siteId1&b=siteId2 — compare two sites SEO health */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const siteAId = req.nextUrl.searchParams.get("a")
  const siteBId = req.nextUrl.searchParams.get("b")
  if (!siteAId || !siteBId) return NextResponse.json({ error: "Both ?a= and ?b= site IDs are required" }, { status: 400 })

  const [siteA, siteB] = await Promise.all([
    getSiteById(siteAId, session.user.id),
    getSiteById(siteBId, session.user.id),
  ])
  if (!siteA || !siteB) return NextResponse.json({ error: "One or both sites not found" }, { status: 404 })

  const [auditA, auditB] = await Promise.all([
    getLatestAuditForSite(siteAId),
    getLatestAuditForSite(siteBId),
  ])

  const [issuesA, issuesB] = await Promise.all([
    auditA ? getIssuesByAudit(auditA.id, { limit: 200 }) : Promise.resolve([]),
    auditB ? getIssuesByAudit(auditB.id, { limit: 200 }) : Promise.resolve([]),
  ])

  function summarize(site: typeof siteA, audit: typeof auditA, issues: typeof issuesA) {
    return {
      siteId: site!.id,
      domain: site!.domain,
      displayName: site!.displayName ?? null,
      healthScore: audit?.healthScore ?? null,
      pagesCount: audit?.pagesCount ?? null,
      critical: issues.filter(i => i.severity === "critical").length,
      warnings: issues.filter(i => i.severity === "warning").length,
      info: issues.filter(i => i.severity === "info").length,
      categories: Object.fromEntries(
        ["technical", "on_page", "content", "links"].map(cat => [
          cat,
          issues.filter(i => i.category === cat).length,
        ])
      ),
      lastAudit: audit?.completedAt ?? null,
    }
  }

  return NextResponse.json({
    data: {
      siteA: summarize(siteA, auditA, issuesA),
      siteB: summarize(siteB, auditB, issuesB),
    },
  })
}
