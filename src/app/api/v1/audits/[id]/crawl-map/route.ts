import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/crawl-map?limit=200
 *  Per-page crawl structure: url, depth, in/out links, score, noindex
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

  const limit = Math.min(500, parseInt(req.nextUrl.searchParams.get("limit") ?? "200"))
  const pages = (audit.pageAnalyses as PageAnalysis[])

  return NextResponse.json({
    data: {
      auditId: id,
      siteId: audit.siteId,
      total: pages.length,
      pages: pages.slice(0, limit).map(p => ({
        url: p.url,
        depth: Math.max(0, p.url.split("/").length - 3),
        incomingLinks: p.incomingInternalLinks ?? 0,
        outgoingLinks: p.internalLinkCount,
        onPageScore: p.onPageScore,
        wordCount: p.wordCount,
        isNoindex: p.isNoindex,
        hasSchema: p.hasJsonLd,
      })),
    },
  })
}
