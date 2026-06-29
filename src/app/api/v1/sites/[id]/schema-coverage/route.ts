import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/schema-coverage — JSON-LD schema adoption stats */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit?.pageAnalyses) return NextResponse.json({ data: { auditId: null, stats: null } })

  const pages = (audit.pageAnalyses as PageAnalysis[])
  const indexable = pages.filter(p => !p.isNoindex)
  const total = indexable.length

  if (total === 0) return NextResponse.json({ data: { auditId: audit.id, stats: null } })

  const withSchema = indexable.filter(p => p.hasJsonLd)
  const withoutSchema = indexable.filter(p => !p.hasJsonLd)
  const contentPagesNoSchema = withoutSchema.filter(p => (p.wordCount ?? 0) >= 300)
  const adoptionPct = Math.round(withSchema.length / total * 100)

  return NextResponse.json({
    data: {
      auditId: audit.id,
      completedAt: audit.completedAt?.toISOString().slice(0, 10) ?? null,
      stats: {
        totalIndexablePages: total,
        pagesWithSchema: withSchema.length,
        pagesWithoutSchema: withoutSchema.length,
        contentPagesWithoutSchema: contentPagesNoSchema.length,
        adoptionPct,
        topPagesNeedingSchema: contentPagesNoSchema
          .sort((a, b) => b.onPageScore - a.onPageScore)
          .slice(0, 10)
          .map(p => ({ url: p.url, onPageScore: p.onPageScore, wordCount: p.wordCount })),
      },
    },
  })
}
