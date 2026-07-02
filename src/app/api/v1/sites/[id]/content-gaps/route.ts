import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import { getKeywordPositionChanges } from "@/db/repositories/gsc"
import type { PageAnalysis } from "@/domain/audit/types"

/**
 * GET /api/v1/sites/:id/content-gaps
 * Pages ranking positions 11–30 with low on-page score (<70) — content gap opportunities.
 * These are pages Google knows about but aren't yet showing on page 1.
 * Requires GSC to be connected.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [audit, keywords] = await Promise.all([
    getLatestAuditForSite(id),
    site.gscConnected ? getKeywordPositionChanges(id, 100) : Promise.resolve([]),
  ])

  const pages = audit?.pageAnalyses ? (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex) : []

  // Build URL → on-page score map from audit
  const pageScoreMap = new Map(pages.map(p => {
    const path = p.url.replace(/^https?:\/\/[^/]+/, "") || "/"
    return [path, p.onPageScore]
  }))

  // Find keywords ranking 11–30 with low on-page score
  const gaps = keywords
    .filter(k => {
      const pos = parseFloat(k.positionAvg)
      return pos >= 11 && pos <= 30
    })
    .map(k => {
      // Try to match keyword to a page via URL path check
      const matchedPage = pages.find(p =>
        p.title?.toLowerCase().includes(k.keyword.toLowerCase()) ||
        p.url.toLowerCase().includes(k.keyword.toLowerCase().replace(/\s+/g, "-"))
      )
      const onPageScore = matchedPage ? matchedPage.onPageScore : null
      const path = matchedPage ? matchedPage.url.replace(/^https?:\/\/[^/]+/, "") || "/" : null

      return {
        keyword: k.keyword,
        position: parseFloat(k.positionAvg).toFixed(1),
        clicks: k.clicks,
        impressions: k.impressions,
        ctr: parseFloat(k.ctrPct).toFixed(1),
        matchedUrl: path,
        onPageScore,
        opportunity: onPageScore != null && onPageScore < 70 ? "high" : onPageScore != null ? "medium" : "unknown",
      }
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)

  // Pages with low score (<60) that have inbound keywords
  const lowScorePages = pages
    .filter(p => p.onPageScore < 60)
    .sort((a, b) => a.onPageScore - b.onPageScore)
    .slice(0, 10)
    .map(p => ({
      url: p.url,
      path: p.url.replace(/^https?:\/\/[^/]+/, "") || "/",
      onPageScore: p.onPageScore,
      wordCount: p.wordCount ?? 0,
      missingH1: !p.h1Text,
      missingTitle: !p.title,
      missingMeta: !p.metaDescription,
    }))

  return NextResponse.json({
    data: {
      siteId: id,
      gscConnected: site.gscConnected ?? false,
      gaps,
      lowScorePages,
      summary: {
        totalGaps: gaps.length,
        highOpportunity: gaps.filter(g => g.opportunity === "high").length,
        totalLowScorePages: lowScorePages.length,
        avgGapPosition: gaps.length > 0 ? (gaps.reduce((s, g) => s + parseFloat(g.position), 0) / gaps.length).toFixed(1) : null,
      },
    },
  })
}
