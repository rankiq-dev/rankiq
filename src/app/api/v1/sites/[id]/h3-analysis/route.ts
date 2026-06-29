import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/h3-analysis — H3 heading coverage stats from latest audit */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: null })

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)
  const longPages = pages.filter(p => (p.wordCount ?? 0) >= 600)

  const withH3 = longPages.filter(p => p.h3Count > 0)
  const withoutH3 = longPages.filter(p => p.h3Count === 0)
  const avgH3Count = longPages.length > 0
    ? parseFloat((longPages.reduce((s, p) => s + p.h3Count, 0) / longPages.length).toFixed(1))
    : 0
  const h3CoveragePct = longPages.length > 0 ? Math.round(withH3.length / longPages.length * 100) : 0

  return NextResponse.json({
    data: {
      auditId: audit.id,
      longPages: longPages.length,
      withH3: withH3.length,
      withoutH3: withoutH3.length,
      h3CoveragePct,
      avgH3Count,
      pagesNeedingH3: withoutH3.slice(0, 20).map(p => ({ url: p.url, wordCount: p.wordCount })),
    },
  })
}
