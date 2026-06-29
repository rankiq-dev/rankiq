import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/h1-analysis?issue=missing|multiple|duplicate&limit=100
 *  Returns H1 tag analysis from latest audit
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
  const h1Texts = allPages.map(p => p.h1Text).filter(Boolean)
  const h1Frequency = new Map<string, number>()
  for (const h1 of h1Texts) h1Frequency.set(h1!, (h1Frequency.get(h1!) ?? 0) + 1)
  const duplicateH1s = new Set([...h1Frequency.entries()].filter(([, count]) => count > 1).map(([h1]) => h1))

  let pages = allPages
  if (issueFilter === "missing") pages = pages.filter(p => !p.h1Text)
  else if (issueFilter === "multiple") pages = pages.filter(p => (p.h1Count ?? 0) > 1)
  else if (issueFilter === "duplicate") pages = pages.filter(p => p.h1Text && duplicateH1s.has(p.h1Text))
  else if (issueFilter === "ok") pages = pages.filter(p => p.h1Text && (p.h1Count ?? 1) === 1 && !duplicateH1s.has(p.h1Text))

  return NextResponse.json({
    data: {
      auditId: audit.id,
      total: pages.length,
      summary: {
        totalIndexable: allPages.length,
        missingH1: allPages.filter(p => !p.h1Text).length,
        multipleH1: allPages.filter(p => (p.h1Count ?? 0) > 1).length,
        duplicateH1: allPages.filter(p => p.h1Text && duplicateH1s.has(p.h1Text)).length,
      },
      pages: pages.slice(0, limit).map(p => ({
        url: p.url,
        h1Text: p.h1Text ?? null,
        h1Count: p.h1Count ?? 0,
        isDuplicate: p.h1Text ? duplicateH1s.has(p.h1Text) : false,
        onPageScore: p.onPageScore,
      })),
    },
  })
}
