import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/summary — full audit summary including page analysis stats */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const issues = await getIssuesByAudit(id, { limit: 500 })
  const pages = (audit.pageAnalyses as PageAnalysis[] | null) ?? []

  const openIssues = issues.filter(i => !i.isFixed)
  const fixedIssues = issues.filter(i => i.isFixed)

  const bySeverity = {
    critical: { total: 0, open: 0, fixed: 0 },
    warning: { total: 0, open: 0, fixed: 0 },
    info: { total: 0, open: 0, fixed: 0 },
  } as Record<string, { total: number; open: number; fixed: number }>
  for (const i of issues) {
    const sev = i.severity as string
    if (!bySeverity[sev]) bySeverity[sev] = { total: 0, open: 0, fixed: 0 }
    bySeverity[sev]!.total++
    if (i.isFixed) bySeverity[sev]!.fixed++
    else bySeverity[sev]!.open++
  }

  const pageStats = pages.length > 0 ? {
    total: pages.length,
    avgOnPageScore: Math.round(pages.reduce((s, p) => s + p.onPageScore, 0) / pages.length),
    thinPages: pages.filter(p => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < 300).length,
    missingH1: pages.filter(p => !p.h1Text && !p.isNoindex).length,
    missingCanonical: pages.filter(p => !p.hasCanonical && !p.isNoindex).length,
    missingSchema: pages.filter(p => !p.hasJsonLd && !p.isNoindex).length,
    noindexPages: pages.filter(p => p.isNoindex).length,
    pagesWithAltIssues: pages.filter(p => (p.imagesMissingAlt ?? 0) > 0).length,
    totalImages: pages.reduce((s, p) => s + (p.imageCount ?? 0), 0),
    totalMissingAlt: pages.reduce((s, p) => s + (p.imagesMissingAlt ?? 0), 0),
  } : null

  return NextResponse.json({
    data: {
      auditId: id,
      siteId: audit.siteId,
      domain: site.domain,
      status: audit.status,
      healthScore: audit.healthScore,
      pagesCount: audit.pagesCount,
      completedAt: audit.completedAt?.toISOString() ?? null,
      issues: {
        total: issues.length,
        open: openIssues.length,
        fixed: fixedIssues.length,
        fixPct: issues.length > 0 ? Math.round(fixedIssues.length / issues.length * 100) : 0,
        bySeverity,
      },
      pageStats,
    },
  })
}
