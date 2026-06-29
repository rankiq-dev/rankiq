import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

interface Benchmark { metric: string; value: number | string; benchmark: string; status: "pass" | "warn" | "fail"; note?: string }

/** GET /api/v1/sites/:id/performance-benchmarks — site metrics vs SEO best-practice benchmarks */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: null })

  const pages = (audit.pageAnalyses as PageAnalysis[]).filter(p => !p.isNoindex)
  if (pages.length === 0) return NextResponse.json({ data: null })

  const avgScore = Math.round(pages.reduce((s, p) => s + p.onPageScore, 0) / pages.length)
  const h1CoveragePct = Math.round(pages.filter(p => !!p.h1Text).length / pages.length * 100)
  const titleCoveragePct = Math.round(pages.filter(p => !!p.title).length / pages.length * 100)
  const canonicalPct = Math.round(pages.filter(p => p.hasCanonical).length / pages.length * 100)
  const schemaPct = Math.round(pages.filter(p => p.hasJsonLd).length / pages.length * 100)
  const avgWordCount = Math.round(pages.reduce((s, p) => s + (p.wordCount ?? 0), 0) / pages.length)
  const orphanPct = Math.round(pages.filter(p => (p.incomingInternalLinks ?? 0) === 0).length / pages.length * 100)
  const thinPct = Math.round(pages.filter(p => (p.wordCount ?? 0) < 300).length / pages.length * 100)

  const benchmarks: Benchmark[] = [
    { metric: "Avg on-page score", value: avgScore, benchmark: "≥75", status: avgScore >= 75 ? "pass" : avgScore >= 50 ? "warn" : "fail" },
    { metric: "H1 coverage", value: `${h1CoveragePct}%`, benchmark: "100%", status: h1CoveragePct === 100 ? "pass" : h1CoveragePct >= 90 ? "warn" : "fail" },
    { metric: "Title tag coverage", value: `${titleCoveragePct}%`, benchmark: "100%", status: titleCoveragePct === 100 ? "pass" : titleCoveragePct >= 90 ? "warn" : "fail" },
    { metric: "Canonical tags", value: `${canonicalPct}%`, benchmark: "≥95%", status: canonicalPct >= 95 ? "pass" : canonicalPct >= 80 ? "warn" : "fail" },
    { metric: "Schema markup", value: `${schemaPct}%`, benchmark: "≥50%", status: schemaPct >= 50 ? "pass" : schemaPct >= 20 ? "warn" : "fail" },
    { metric: "Avg word count", value: avgWordCount, benchmark: "≥300", status: avgWordCount >= 300 ? "pass" : avgWordCount >= 150 ? "warn" : "fail" },
    { metric: "Orphan pages", value: `${orphanPct}%`, benchmark: "≤15%", status: orphanPct <= 15 ? "pass" : orphanPct <= 30 ? "warn" : "fail" },
    { metric: "Thin content", value: `${thinPct}%`, benchmark: "≤20%", status: thinPct <= 20 ? "pass" : thinPct <= 40 ? "warn" : "fail" },
  ]

  const passing = benchmarks.filter(b => b.status === "pass").length
  const overallGrade = passing >= 7 ? "A" : passing >= 5 ? "B" : passing >= 3 ? "C" : "D"

  return NextResponse.json({
    data: {
      auditId: audit.id,
      totalPages: pages.length,
      overallGrade,
      passingCount: passing,
      totalBenchmarks: benchmarks.length,
      benchmarks,
    },
  })
}
