import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/orphan-pages?limit=50
 *  Pages with 0 incoming internal links (unreachable via internal navigation)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: { auditId: null, total: 0, pages: [] } })

  const limit = Math.min(200, parseInt(req.nextUrl.searchParams.get("limit") ?? "50"))
  const orphans = (audit.pageAnalyses as PageAnalysis[])
    .filter(p => !p.isNoindex && (p.incomingInternalLinks ?? 0) === 0)
    .sort((a, b) => b.onPageScore - a.onPageScore)

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: orphans.length,
      pages: orphans.slice(0, limit).map(p => ({
        url: p.url,
        onPageScore: p.onPageScore,
        wordCount: p.wordCount,
        outgoingLinks: p.internalLinkCount,
        title: p.title,
      })),
    },
  })
}
