import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import { getKeywordPositionChanges } from "@/db/repositories/gsc"
import type { PageAnalysis } from "@/domain/audit/types"

/**
 * GET /api/v1/sites/:id/keyword-opportunity-score
 * Composite score for each keyword based on: position proximity to page 1, impressions volume,
 * and matched page on-page score. Higher = easier to rank with content fixes.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!site.gscConnected) return NextResponse.json({ data: { gscRequired: true, keywords: [] } })

  const [audit, keywords] = await Promise.all([
    getLatestAuditForSite(id),
    getKeywordPositionChanges(id, 100),
  ])

  const pages = audit?.pageAnalyses ? (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex) : []

  const scored = keywords.map(k => {
    const pos = parseFloat(k.positionAvg)

    // Position score: closer to p1 = higher (max 50 pts)
    const posScore = pos <= 3 ? 0 : pos <= 10 ? 30 : pos <= 20 ? 50 : pos <= 30 ? 35 : 10

    // Volume score: more impressions = higher (max 30 pts)
    const volScore = Math.min(30, Math.round((k.impressions / 1000) * 30))

    // On-page score: low on-page = more room for improvement (max 20 pts)
    const matchedPage = pages.find(p =>
      p.title?.toLowerCase().includes(k.keyword.toLowerCase()) ||
      p.url.toLowerCase().includes(k.keyword.toLowerCase().replace(/\s+/g, "-"))
    )
    const onPageScore = matchedPage?.onPageScore ?? null
    const contentScore = onPageScore != null ? Math.round((1 - onPageScore / 100) * 20) : 10

    const opportunityScore = posScore + volScore + contentScore

    return {
      keyword: k.keyword,
      position: pos.toFixed(1),
      impressions: k.impressions,
      clicks: k.clicks,
      ctr: parseFloat(k.ctrPct).toFixed(1),
      matchedUrl: matchedPage ? matchedPage.url.replace(/^https?:\/\/[^/]+/, "") || "/" : null,
      onPageScore,
      opportunityScore,
      tier: opportunityScore >= 70 ? "high" : opportunityScore >= 40 ? "medium" : "low",
    }
  })
  .filter(k => parseFloat(k.position) <= 30)
  .sort((a, b) => b.opportunityScore - a.opportunityScore)
  .slice(0, 25)

  return NextResponse.json({
    data: {
      siteId: id,
      keywords: scored,
      topOpportunity: scored[0] ?? null,
      highCount: scored.filter(k => k.tier === "high").length,
    },
  })
}
