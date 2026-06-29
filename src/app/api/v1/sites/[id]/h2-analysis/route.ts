import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/h2-analysis — H2 heading coverage stats from latest audit */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: null })

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)
  const substantive = pages.filter(p => (p.wordCount ?? 0) >= 300)

  const withH2 = substantive.filter(p => p.h2Count > 0)
  const withoutH2 = substantive.filter(p => p.h2Count === 0)
  const avgH2Count = substantive.length > 0
    ? parseFloat((substantive.reduce((s, p) => s + p.h2Count, 0) / substantive.length).toFixed(1))
    : 0
  const h2CoveragePct = substantive.length > 0 ? Math.round(withH2.length / substantive.length * 100) : 0

  return NextResponse.json({
    data: {
      auditId: audit.id,
      totalIndexable: pages.length,
      substantivePages: substantive.length,
      withH2: withH2.length,
      withoutH2: withoutH2.length,
      h2CoveragePct,
      avgH2Count,
      pagesNeedingH2: withoutH2.slice(0, 20).map(p => ({ url: p.url, wordCount: p.wordCount })),
    },
  })
}
