import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/images?issue=missing_alt&limit=50
 *  Image alt text analysis per page
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!audit.pageAnalyses) return NextResponse.json({ data: { auditId: id, total: 0, pages: [], summary: null } })

  const sp = req.nextUrl.searchParams
  const issueFilter = sp.get("issue")
  const limit = Math.min(500, parseInt(sp.get("limit") ?? "50"))

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex && (p.imageCount ?? 0) > 0)

  const totalImages = pages.reduce((s, p) => s + (p.imageCount ?? 0), 0)
  const totalMissingAlt = pages.reduce((s, p) => s + (p.imagesMissingAlt ?? 0), 0)
  const altCoveragePct = totalImages > 0 ? Math.round((totalImages - totalMissingAlt) / totalImages * 100) : 100

  let filtered = pages
  if (issueFilter === "missing_alt") filtered = pages.filter(p => (p.imagesMissingAlt ?? 0) > 0)

  filtered = [...filtered].sort((a, b) => (b.imagesMissingAlt ?? 0) - (a.imagesMissingAlt ?? 0))

  return NextResponse.json({
    data: {
      auditId: id,
      summary: {
        pagesWithImages: pages.length,
        totalImages,
        totalMissingAlt,
        altCoveragePct,
      },
      total: filtered.length,
      pages: filtered.slice(0, limit).map(p => ({
        url: p.url,
        imageCount: p.imageCount ?? 0,
        imagesMissingAlt: p.imagesMissingAlt ?? 0,
        altCoveragePct: (p.imageCount ?? 0) > 0
          ? Math.round(((p.imageCount ?? 0) - (p.imagesMissingAlt ?? 0)) / (p.imageCount ?? 1) * 100)
          : 100,
      })),
    },
  })
}
