import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/page-titles?issue=missing|short|long&limit=100
 *  Returns page titles with length validation from latest audit
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: { auditId: null, total: 0, pages: [] } })

  const sp = req.nextUrl.searchParams
  const issueFilter = sp.get("issue")
  const limit = Math.min(500, parseInt(sp.get("limit") ?? "100"))

  let pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)

  if (issueFilter === "missing") pages = pages.filter(p => !p.title)
  else if (issueFilter === "short") pages = pages.filter(p => p.title && p.titleLength < 30)
  else if (issueFilter === "long") pages = pages.filter(p => p.title && p.titleLength > 60)
  else if (issueFilter === "optimal") pages = pages.filter(p => p.title && p.titleLength >= 30 && p.titleLength <= 60)

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      pages: pages.slice(0, limit).map(p => ({
        url: p.url,
        title: p.title ?? null,
        titleLength: p.titleLength ?? null,
        quality: !p.title ? "missing" : p.titleLength < 30 ? "short" : p.titleLength > 60 ? "long" : "optimal",
        onPageScore: p.onPageScore,
      })),
    },
  })
}
