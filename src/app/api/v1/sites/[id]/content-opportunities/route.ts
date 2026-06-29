import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/content-opportunities?limit=20
 *  Pages that rank but have below-average on-page scores — quick SEO wins
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") ?? "20"))

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: { opportunities: [] } })

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)
  const avgScore = pages.length > 0 ? pages.reduce((s, p) => s + p.onPageScore, 0) / pages.length : 70

  // Pages below avg score with decent word count — good "improve and rank" candidates
  const opportunities = pages
    .filter(p => p.onPageScore < avgScore && (p.wordCount ?? 0) >= 200)
    .sort((a, b) => {
      // Sort by: opportunity = (avgScore - score) × wordCount bonus
      const scoreGap = avgScore - a.onPageScore
      const scoreGapB = avgScore - b.onPageScore
      return scoreGapB * Math.log(Math.max(b.wordCount ?? 1, 1)) - scoreGap * Math.log(Math.max(a.wordCount ?? 1, 1))
    })
    .slice(0, limit)

  let gscImpressions: Record<string, number> = {}
  if (site.gscConnected) {
    const keywords = await getKeywordMetricsBySite(id)
    // We don't have per-URL impression data from GSC, but can note total
    const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0)
    gscImpressions = { _total: totalImpressions }
  }

  return NextResponse.json({
    data: {
      auditId: audit.id,
      avgScore: Math.round(avgScore),
      totalOpportunities: pages.filter(p => p.onPageScore < avgScore && (p.wordCount ?? 0) >= 200).length,
      hasGscData: !!gscImpressions._total,
      opportunities: opportunities.map(p => ({
        url: p.url,
        onPageScore: p.onPageScore,
        scoreGap: Math.round(avgScore - p.onPageScore),
        wordCount: p.wordCount ?? 0,
        title: p.title ?? null,
        missingH1: !p.h1Text,
        missingSchema: !p.hasJsonLd,
        missingCanonical: !p.hasCanonical,
        issueTypes: p.issueTypes ?? [],
      })),
    },
  })
}
