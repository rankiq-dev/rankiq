import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"
import type { PageAnalysis } from "@/domain/audit/types"

/** GET /api/v1/sites/:id/recommendations
 *  Prioritised recommendations derived from latest audit data
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const site = await getSiteById(id, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const audit = await getLatestAuditForSite(id)
  if (!audit) return NextResponse.json({ data: { recommendations: [], auditId: null } })

  const issues = await getIssuesByAudit(audit.id, { limit: 200 })
  const pages = audit.pageAnalyses ? (audit.pageAnalyses as PageAnalysis[]) : []
  const indexable = pages.filter(p => !p.isNoindex)

  const recs: { priority: number; category: string; title: string; description: string; affectedCount?: number }[] = []

  // Critical issues
  const criticalIssues = issues.filter(i => i.severity === "critical" && !i.isFixed)
  if (criticalIssues.length > 0) {
    recs.push({
      priority: 1,
      category: "critical",
      title: `Fix ${criticalIssues.length} critical SEO issue${criticalIssues.length > 1 ? "s" : ""}`,
      description: `You have ${criticalIssues.length} critical issues that are likely hurting your search rankings. Address these first.`,
      affectedCount: criticalIssues.reduce((s, i) => s + (i.affectedCount ?? 0), 0),
    })
  }

  // Missing H1
  const missingH1 = indexable.filter(p => !p.h1Text)
  if (missingH1.length > 0) {
    recs.push({ priority: 2, category: "on-page", title: "Add H1 tags to pages", description: `${missingH1.length} pages are missing H1 tags. Add a clear, keyword-rich H1 to each page.`, affectedCount: missingH1.length })
  }

  // Thin content
  const thin = indexable.filter(p => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < 300)
  if (thin.length > indexable.length * 0.15) {
    recs.push({ priority: 3, category: "content", title: "Expand thin content pages", description: `${thin.length} pages have fewer than 300 words. Expand these with more helpful, relevant content.`, affectedCount: thin.length })
  }

  // Missing meta descriptions
  const noMeta = indexable.filter(p => !p.metaDescription)
  if (noMeta.length > 0) {
    recs.push({ priority: 4, category: "meta", title: "Write meta descriptions", description: `${noMeta.length} pages lack a meta description. Meta descriptions can improve click-through rate from search results.`, affectedCount: noMeta.length })
  }

  // Missing schema
  const noSchema = indexable.filter(p => !p.hasJsonLd && (p.wordCount ?? 0) >= 300)
  if (noSchema.length > indexable.length * 0.5) {
    recs.push({ priority: 5, category: "schema", title: "Add structured data (JSON-LD)", description: `${noSchema.length} content pages lack JSON-LD schema. Schema markup can unlock rich results in Google.`, affectedCount: noSchema.length })
  }

  // Missing canonical
  const noCanonical = indexable.filter(p => !p.hasCanonical)
  if (noCanonical.length > 0) {
    recs.push({ priority: 6, category: "technical", title: "Add canonical tags", description: `${noCanonical.length} pages are missing canonical tags. These help prevent duplicate content issues.`, affectedCount: noCanonical.length })
  }

  // Orphan pages
  const orphans = indexable.filter(p => (p.incomingInternalLinks ?? 0) === 0)
  if (orphans.length > 2) {
    recs.push({ priority: 7, category: "internal-linking", title: "Link to orphan pages", description: `${orphans.length} pages receive no internal links. Link to them from related content to improve crawlability.`, affectedCount: orphans.length })
  }

  // Missing alt text
  const totalImages = indexable.reduce((s, p) => s + (p.imageCount ?? 0), 0)
  const missingAlt = indexable.reduce((s, p) => s + (p.imagesMissingAlt ?? 0), 0)
  if (missingAlt > 5 && totalImages > 0) {
    recs.push({ priority: 8, category: "accessibility", title: "Add alt text to images", description: `${missingAlt} of ${totalImages} images are missing alt text. Alt text helps with accessibility and image search.`, affectedCount: missingAlt })
  }

  return NextResponse.json({
    data: {
      auditId: audit.id,
      healthScore: audit.healthScore,
      recommendations: recs.sort((a, b) => a.priority - b.priority),
    },
  })
}
