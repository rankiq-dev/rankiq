import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/content-stats — aggregated content quality stats from latest audit */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) {
    return NextResponse.json({ data: { auditId: null, stats: null } })
  }

  const pages = (audit.pageAnalyses as PageAnalysis[])
  const indexable = pages.filter(p => !p.isNoindex)
  const total = indexable.length

  if (total === 0) return NextResponse.json({ data: { auditId: audit.id, stats: null } })

  const withWords = indexable.filter(p => (p.wordCount ?? 0) > 0)
  const totalWords = withWords.reduce((s, p) => s + (p.wordCount ?? 0), 0)
  const avgWordCount = withWords.length > 0 ? Math.round(totalWords / withWords.length) : 0
  const thinPages = indexable.filter(p => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < 300).length
  const richPages = indexable.filter(p => (p.wordCount ?? 0) >= 600).length

  const totalImages = indexable.reduce((s, p) => s + (p.imageCount ?? 0), 0)
  const missingAltImages = indexable.reduce((s, p) => s + (p.imagesMissingAlt ?? 0), 0)

  const missingH1 = indexable.filter(p => !p.h1Text).length
  const multipleH1 = indexable.filter(p => (p.h1Count ?? 0) > 1).length
  const missingMeta = indexable.filter(p => !p.metaDescription).length
  const missingCanonical = indexable.filter(p => !p.hasCanonical).length
  const withSchema = indexable.filter(p => p.hasJsonLd).length
  const avgScore = Math.round(indexable.reduce((s, p) => s + p.onPageScore, 0) / total)
  const excellent = indexable.filter(p => p.onPageScore >= 90).length
  const poor = indexable.filter(p => p.onPageScore < 50).length

  return NextResponse.json({
    data: {
      auditId: audit.id,
      completedAt: audit.completedAt?.toISOString() ?? null,
      stats: {
        totalIndexablePages: total,
        noindexPages: pages.filter(p => p.isNoindex).length,
        avgWordCount,
        totalWords,
        thinPages,
        richPages,
        avgOnPageScore: avgScore,
        excellentPages: excellent,
        poorPages: poor,
        missingH1,
        multipleH1,
        missingMetaDescription: missingMeta,
        missingCanonical,
        pagesWithSchema: withSchema,
        schemaAdoptionPct: Math.round(withSchema / total * 100),
        totalImages,
        missingAltImages,
        imgAltCoveragePct: totalImages > 0 ? Math.round((1 - missingAltImages / totalImages) * 100) : 100,
      },
    },
  })
}
