import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/noindex-pages?limit=100
 *  Returns pages with noindex directive from latest audit
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: { auditId: null, total: 0, pages: [] } })

  const limit = Math.min(500, parseInt(req.nextUrl.searchParams.get("limit") ?? "100"))
  const noindexPages = (audit.pageAnalyses as PageAnalysis[])
    .filter(p => p.isNoindex)
    .sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))

  const totalPages = (audit.pageAnalyses as PageAnalysis[]).length
  const noindexPct = totalPages > 0 ? Math.round(noindexPages.length / totalPages * 100) : 0

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: noindexPages.length,
      noindexPct,
      totalPages,
      pages: noindexPages.slice(0, limit).map(p => ({
        url: p.url,
        wordCount: p.wordCount ?? 0,
        title: p.title ?? null,
        onPageScore: p.onPageScore,
      })),
    },
  })
}
