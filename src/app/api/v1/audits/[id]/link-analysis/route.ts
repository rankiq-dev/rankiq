import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/link-analysis — internal link network stats from pageAnalyses */
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
  if (pages.length === 0) return NextResponse.json({ data: null })

  const totalOutgoing = pages.reduce((s, p) => s + (p.internalLinkCount ?? 0), 0)
  const totalIncoming = pages.reduce((s, p) => s + (p.incomingInternalLinks ?? 0), 0)
  const avgOutgoing = parseFloat((totalOutgoing / pages.length).toFixed(1))
  const avgIncoming = parseFloat((totalIncoming / pages.length).toFixed(1))
  const orphans = pages.filter(p => (p.incomingInternalLinks ?? 0) === 0).length
  const orphanPct = Math.round(orphans / pages.length * 100)

  const topLinked = [...pages]
    .sort((a, b) => (b.incomingInternalLinks ?? 0) - (a.incomingInternalLinks ?? 0))
    .slice(0, 10)
    .map(p => ({ url: p.url, incomingLinks: p.incomingInternalLinks ?? 0, outgoingLinks: p.internalLinkCount ?? 0 }))

  const leastLinked = [...pages]
    .filter(p => (p.incomingInternalLinks ?? 0) === 0)
    .sort((a, b) => b.onPageScore - a.onPageScore)
    .slice(0, 10)
    .map(p => ({ url: p.url, onPageScore: p.onPageScore, outgoingLinks: p.internalLinkCount ?? 0 }))

  return NextResponse.json({
    data: {
      auditId: id,
      totalPages: pages.length,
      totalOutgoingLinks: totalOutgoing,
      totalIncomingLinks: totalIncoming,
      avgOutgoingLinks: avgOutgoing,
      avgIncomingLinks: avgIncoming,
      orphanPages: orphans,
      orphanPct,
      topLinked,
      leastLinked,
    },
  })
}
