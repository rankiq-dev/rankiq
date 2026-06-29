import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/seo-report — comprehensive SEO metrics snapshot */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit) return NextResponse.json({ data: { siteId: id, domain: site.domain, hasAudit: false } })

  const issues = audit.status === "complete" ? await getIssuesByAudit(audit.id, { limit: 500 }) : []
  const open = issues.filter(i => !i.isFixed)

  const pages = audit.pageAnalyses ? (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex) : []

  const avgScore = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + p.onPageScore, 0) / pages.length) : null
  const avgWords = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + (p.wordCount ?? 0), 0) / pages.length) : null
  const h1Coverage = pages.length > 0 ? Math.round(pages.filter(p => !!p.h1Text).length / pages.length * 100) : null
  const schemaCoverage = pages.length > 0 ? Math.round(pages.filter(p => p.hasJsonLd).length / pages.length * 100) : null
  const canonicalCoverage = pages.length > 0 ? Math.round(pages.filter(p => p.hasCanonical).length / pages.length * 100) : null
  const orphanPct = pages.length > 0 ? Math.round(pages.filter(p => (p.incomingInternalLinks ?? 0) === 0).length / pages.length * 100) : null

  const healthScore = audit.healthScore ?? null
  const grade = healthScore == null ? null : healthScore >= 90 ? "A" : healthScore >= 75 ? "B" : healthScore >= 60 ? "C" : healthScore >= 40 ? "D" : "F"

  return NextResponse.json({
    data: {
      siteId: id,
      domain: site.domain,
      displayName: site.displayName ?? null,
      hasAudit: true,
      audit: {
        id: audit.id,
        status: audit.status,
        completedAt: audit.completedAt?.toISOString() ?? null,
        pagesCount: audit.pagesCount ?? null,
        healthScore,
        grade,
      },
      issues: {
        total: open.length,
        critical: open.filter(i => i.severity === "critical").length,
        warning: open.filter(i => i.severity === "warning").length,
        info: open.filter(i => i.severity === "info").length,
      },
      content: {
        totalIndexablePages: pages.length,
        avgOnPageScore: avgScore,
        avgWordCount: avgWords,
        h1CoveragePct: h1Coverage,
        schemaCoveragePct: schemaCoverage,
        canonicalCoveragePct: canonicalCoverage,
        orphanPagePct: orphanPct,
      },
      gscConnected: site.gscConnected ?? false,
      generatedAt: new Date().toISOString(),
    },
  })
}
