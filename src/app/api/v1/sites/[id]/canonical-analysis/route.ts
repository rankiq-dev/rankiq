import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/canonical-analysis?issue=missing&limit=100
 *  Returns canonical tag status per page from latest audit
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
  let pages = allPages

  if (issueFilter === "missing") pages = pages.filter(p => !p.hasCanonical)
  else if (issueFilter === "ok") pages = pages.filter(p => p.hasCanonical)

  const withCanonical = allPages.filter(p => p.hasCanonical).length
  const coveragePct = allPages.length > 0 ? Math.round(withCanonical / allPages.length * 100) : 100

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      summary: {
        totalIndexable: allPages.length,
        withCanonical,
        missingCanonical: allPages.length - withCanonical,
        coveragePct,
      },
      pages: pages.slice(0, limit).map(p => ({
        url: p.url,
        hasCanonical: p.hasCanonical,
        onPageScore: p.onPageScore,
        wordCount: p.wordCount,
        title: p.title ?? null,
      })),
    },
  })
}
