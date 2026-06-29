import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/pages?page=1&limit=50&sort=score — pages from latest complete audit */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audits = await getAuditsForSite(id, 5)
  const latestAudit = audits.find(a => a.status === "complete" && a.pageAnalyses != null)
  if (!latestAudit) return NextResponse.json({ data: { pages: [], total: 0, auditId: null } })

  const pages = (latestAudit.pageAnalyses as PageAnalysis[] | null) ?? []

  const sp = req.nextUrl.searchParams
  const sort = sp.get("sort") ?? "score"
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"))
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"))
  const noindex = sp.get("noindex")

  let filtered = [...pages]
  if (noindex === "true") filtered = filtered.filter(p => p.isNoindex)
  else if (noindex === "false") filtered = filtered.filter(p => !p.isNoindex)

  if (sort === "score") filtered.sort((a, b) => a.onPageScore - b.onPageScore)
  else if (sort === "score_desc") filtered.sort((a, b) => b.onPageScore - a.onPageScore)
  else if (sort === "words") filtered.sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))
  else if (sort === "links") filtered.sort((a, b) => b.incomingInternalLinks - a.incomingInternalLinks)

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  return NextResponse.json({
    data: {
      auditId: latestAudit.id,
      auditedAt: latestAudit.completedAt,
      total,
      page,
      limit,
      pages: paginated.map(p => ({
        url: p.url,
        onPageScore: p.onPageScore,
        title: p.title,
        h1: p.h1Text,
        wordCount: p.wordCount,
        internalLinks: p.internalLinkCount,
        incomingLinks: p.incomingInternalLinks,
        imagesMissingAlt: p.imagesMissingAlt,
        hasCanonical: p.hasCanonical,
        hasJsonLd: p.hasJsonLd,
        isNoindex: p.isNoindex,
        issueCount: p.issueTypes?.length ?? 0,
      })),
    },
  })
}
