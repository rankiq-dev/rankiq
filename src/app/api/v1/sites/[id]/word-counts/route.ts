import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/word-counts?sort=asc|desc&limit=100
 *  Returns per-page word counts from latest audit with distribution summary
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
  const limit = Math.min(500, parseInt(sp.get("limit") ?? "100"))
  const minWords = parseInt(sp.get("min") ?? "0")

  const pages = (audit.pageAnalyses as PageAnalysis[])
    .filter(p => !p.isNoindex && (p.wordCount ?? 0) >= minWords)
    .sort((a, b) => sort === "asc" ? (a.wordCount ?? 0) - (b.wordCount ?? 0) : (b.wordCount ?? 0) - (a.wordCount ?? 0))

  const withWords = pages.filter(p => (p.wordCount ?? 0) > 0)
  const avgWordCount = withWords.length > 0 ? Math.round(withWords.reduce((s, p) => s + (p.wordCount ?? 0), 0) / withWords.length) : 0
  const medianIdx = Math.floor(withWords.length / 2)
  const sorted = [...withWords].sort((a, b) => (a.wordCount ?? 0) - (b.wordCount ?? 0))
  const medianWordCount = sorted[medianIdx]?.wordCount ?? 0

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      summary: {
        avgWordCount,
        medianWordCount,
        thinPages: pages.filter(p => (p.wordCount ?? 0) < 300).length,
        richPages: pages.filter(p => (p.wordCount ?? 0) >= 600).length,
        totalWords: withWords.reduce((s, p) => s + (p.wordCount ?? 0), 0),
      },
      pages: pages.slice(0, limit).map(p => ({ url: p.url, wordCount: p.wordCount ?? 0, onPageScore: p.onPageScore })),
    },
  })
}
