import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/top-pages?sort=score|words|links&limit=20
 *  Top pages by on-page score, word count, or incoming links
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!audit.pageAnalyses) return NextResponse.json({ data: { auditId: id, pages: [] } })

  const sp = req.nextUrl.searchParams
  const sort = sp.get("sort") ?? "score"
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "20"))

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)

  const sorted = [...pages].sort((a, b) => {
    if (sort === "words") return (b.wordCount ?? 0) - (a.wordCount ?? 0)
    if (sort === "links") return (b.incomingInternalLinks ?? 0) - (a.incomingInternalLinks ?? 0)
    return b.onPageScore - a.onPageScore
  })

  return NextResponse.json({
    data: {
      auditId: id,
      total: pages.length,
      sortedBy: sort,
      pages: sorted.slice(0, limit).map(p => ({
        url: p.url,
        onPageScore: p.onPageScore,
        title: p.title ?? null,
        wordCount: p.wordCount ?? 0,
        incomingLinks: p.incomingInternalLinks ?? 0,
        outgoingLinks: p.internalLinkCount ?? 0,
        hasH1: !!p.h1Text,
        hasSchema: p.hasJsonLd,
        hasCanonical: p.hasCanonical,
        issueCount: (p.issueTypes ?? []).length,
      })),
    },
  })
}
