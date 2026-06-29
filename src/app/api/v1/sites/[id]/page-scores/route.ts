import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/page-scores?sort=asc|desc&tier=poor|fair|good|excellent&limit=100
 *  Returns on-page score for each page from latest audit
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: { auditId: null, total: 0, pages: [], summary: null } })

  const sp = req.nextUrl.searchParams
  const sort = sp.get("sort") ?? "desc"
  const tier = sp.get("tier")
  const limit = Math.min(500, parseInt(sp.get("limit") ?? "100"))

  let pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)

  if (tier === "poor") pages = pages.filter(p => p.onPageScore < 50)
  else if (tier === "fair") pages = pages.filter(p => p.onPageScore >= 50 && p.onPageScore < 75)
  else if (tier === "good") pages = pages.filter(p => p.onPageScore >= 75 && p.onPageScore < 90)
  else if (tier === "excellent") pages = pages.filter(p => p.onPageScore >= 90)

  pages = [...pages].sort((a, b) => sort === "asc" ? a.onPageScore - b.onPageScore : b.onPageScore - a.onPageScore)

  const all = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)
  const avgScore = all.length > 0 ? Math.round(all.reduce((s, p) => s + p.onPageScore, 0) / all.length) : 0

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      summary: {
        totalIndexable: all.length,
        avgScore,
        poor: all.filter(p => p.onPageScore < 50).length,
        fair: all.filter(p => p.onPageScore >= 50 && p.onPageScore < 75).length,
        good: all.filter(p => p.onPageScore >= 75 && p.onPageScore < 90).length,
        excellent: all.filter(p => p.onPageScore >= 90).length,
      },
      pages: pages.slice(0, limit).map(p => ({
        url: p.url,
        onPageScore: p.onPageScore,
        tier: p.onPageScore < 50 ? "poor" : p.onPageScore < 75 ? "fair" : p.onPageScore < 90 ? "good" : "excellent",
        wordCount: p.wordCount,
        title: p.title ?? null,
      })),
    },
  })
}
