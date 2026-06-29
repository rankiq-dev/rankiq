import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/heading-structure — H1/H2/H3 heading coverage analysis */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!audit.pageAnalyses) return NextResponse.json({ data: null })

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)
  const substantive = pages.filter(p => (p.wordCount ?? 0) >= 300)
  const long = pages.filter(p => (p.wordCount ?? 0) >= 600)

  const h1Stats = {
    total: pages.length,
    withH1: pages.filter(p => !!p.h1Text).length,
    withoutH1: pages.filter(p => !p.h1Text).length,
    multipleH1: pages.filter(p => p.h1Count > 1).length,
    h1CoveragePct: pages.length > 0 ? Math.round(pages.filter(p => !!p.h1Text).length / pages.length * 100) : 0,
  }

  const h2Stats = {
    substantivePages: substantive.length,
    withH2: substantive.filter(p => p.h2Count > 0).length,
    withoutH2: substantive.filter(p => p.h2Count === 0).length,
    avgH2Count: substantive.length > 0 ? parseFloat((substantive.reduce((s, p) => s + p.h2Count, 0) / substantive.length).toFixed(1)) : 0,
    h2CoveragePct: substantive.length > 0 ? Math.round(substantive.filter(p => p.h2Count > 0).length / substantive.length * 100) : 0,
  }

  const h3Stats = {
    longPages: long.length,
    withH3: long.filter(p => p.h3Count > 0).length,
    withoutH3: long.filter(p => p.h3Count === 0).length,
    avgH3Count: long.length > 0 ? parseFloat((long.reduce((s, p) => s + p.h3Count, 0) / long.length).toFixed(1)) : 0,
    h3CoveragePct: long.length > 0 ? Math.round(long.filter(p => p.h3Count > 0).length / long.length * 100) : 0,
  }

  return NextResponse.json({
    data: {
      auditId: id,
      h1: h1Stats,
      h2: h2Stats,
      h3: h3Stats,
    },
  })
}
