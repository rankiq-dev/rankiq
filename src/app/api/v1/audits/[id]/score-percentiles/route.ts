import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/audits/:id/score-percentiles — on-page score percentile distribution */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!audit.pageAnalyses) return NextResponse.json({ data: null })

  const scores = (audit.pageAnalyses as PageAnalysis[])
    .filter(p => !p.isNoindex)
    .map(p => p.onPageScore)
    .sort((a, b) => a - b)

  if (scores.length === 0) return NextResponse.json({ data: null })

  const pct = (p: number) => scores[Math.floor((scores.length - 1) * p / 100)]
  const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)

  return NextResponse.json({
    data: {
      auditId: id,
      total: scores.length,
      avg,
      min: scores[0],
      max: scores[scores.length - 1],
      p10: pct(10),
      p25: pct(25),
      p50: pct(50),
      p75: pct(75),
      p90: pct(90),
    },
  })
}
