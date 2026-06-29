import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/internal-links?sort=incoming&limit=50
 *  Returns page-level internal link stats from the latest audit
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: { pages: [], total: 0, auditId: null } })

  const sp = req.nextUrl.searchParams
  const sort = sp.get("sort") ?? "incoming"
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"))
  const noindex = sp.get("noindex")

  let pages = (audit.pageAnalyses as PageAnalysis[])
  if (noindex === "false") pages = pages.filter(p => !p.isNoindex)
  else if (noindex === "true") pages = pages.filter(p => p.isNoindex)

  pages = [...pages].sort((a, b) =>
    sort === "outgoing" ? b.internalLinkCount - a.internalLinkCount
    : sort === "score" ? b.onPageScore - a.onPageScore
    : (b.incomingInternalLinks ?? 0) - (a.incomingInternalLinks ?? 0)
  )

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      pages: pages.slice(0, limit).map(p => ({
        url: p.url,
        outgoingLinks: p.internalLinkCount,
        incomingLinks: p.incomingInternalLinks ?? 0,
        onPageScore: p.onPageScore,
        isNoindex: p.isNoindex,
        wordCount: p.wordCount,
      })),
    },
  })
}
