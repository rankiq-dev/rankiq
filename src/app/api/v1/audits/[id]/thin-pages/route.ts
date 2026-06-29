import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/thin-pages?threshold=300&limit=100
 *  Pages with fewer words than the threshold (default 300)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!audit.pageAnalyses) return NextResponse.json({ data: { auditId: id, total: 0, pages: [] } })

  const sp = req.nextUrl.searchParams
  const threshold = Math.min(1000, parseInt(sp.get("threshold") ?? "300"))
  const limit = Math.min(500, parseInt(sp.get("limit") ?? "100"))

  const thinPages = (audit.pageAnalyses as PageAnalysis[])
    .filter(p => !p.isNoindex && (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < threshold)
    .sort((a, b) => (a.wordCount ?? 0) - (b.wordCount ?? 0))

  return NextResponse.json({
    data: {
      auditId: id,
      threshold,
      total: thinPages.length,
      pages: thinPages.slice(0, limit).map(p => ({
        url: p.url,
        wordCount: p.wordCount ?? 0,
        onPageScore: p.onPageScore,
        title: p.title ?? null,
        hasH1: !!p.h1Text,
        hasSchema: p.hasJsonLd,
      })),
    },
  })
}
