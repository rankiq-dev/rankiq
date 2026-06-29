import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/meta-descriptions?issue=missing|short|long&limit=100
 *  Returns meta description data with quality classification
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

  if (issueFilter === "missing") pages = pages.filter(p => !p.metaDescription)
  else if (issueFilter === "short") pages = pages.filter(p => p.metaDescription && p.metaDescription.length < 70)
  else if (issueFilter === "long") pages = pages.filter(p => p.metaDescription && p.metaDescription.length > 160)
  else if (issueFilter === "optimal") pages = pages.filter(p => p.metaDescription && p.metaDescription.length >= 70 && p.metaDescription.length <= 160)

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      pages: pages.slice(0, limit).map(p => {
        const len = p.metaDescription?.length ?? 0
        const quality = !p.metaDescription ? "missing" : len < 70 ? "short" : len > 160 ? "long" : "optimal"
        return { url: p.url, metaDescription: p.metaDescription ?? null, length: len, quality, onPageScore: p.onPageScore }
      }),
    },
  })
}
