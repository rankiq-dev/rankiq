import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/image-analysis?issue=missing-alt&limit=100
 *  Returns image alt text coverage analysis from latest audit
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
  const issueFilter = sp.get("issue")
  const limit = Math.min(500, parseInt(sp.get("limit") ?? "100"))

  const allPages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)
  const withImages = allPages.filter(p => (p.imageCount ?? 0) > 0)
  const missingAltPages = withImages.filter(p => (p.imagesMissingAlt ?? 0) > 0)

  const totalImages = allPages.reduce((s, p) => s + (p.imageCount ?? 0), 0)
  const totalMissingAlt = allPages.reduce((s, p) => s + (p.imagesMissingAlt ?? 0), 0)
  const altCoveragePct = totalImages > 0 ? Math.round((1 - totalMissingAlt / totalImages) * 100) : 100

  let pages = allPages
  if (issueFilter === "missing-alt") pages = missingAltPages
  else if (issueFilter === "no-images") pages = allPages.filter(p => (p.imageCount ?? 0) === 0 && (p.wordCount ?? 0) >= 300)
  else if (issueFilter === "with-images") pages = withImages

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      summary: {
        totalIndexablePages: allPages.length,
        pagesWithImages: withImages.length,
        pagesWithMissingAlt: missingAltPages.length,
        totalImages,
        totalMissingAlt,
        altCoveragePct,
      },
      pages: pages.slice(0, limit).map(p => ({
        url: p.url,
        imageCount: p.imageCount ?? 0,
        missingAlt: p.imagesMissingAlt ?? 0,
        altCoveragePct: (p.imageCount ?? 0) > 0 ? Math.round((1 - (p.imagesMissingAlt ?? 0) / (p.imageCount ?? 1)) * 100) : 100,
        onPageScore: p.onPageScore,
      })),
    },
  })
}
