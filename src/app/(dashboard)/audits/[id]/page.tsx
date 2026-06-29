export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit, getHealthSummary, getAuditsForSite } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { PageAnalysis } from "@/domain/audit/types"
import type { AuditIssue } from "@/db/schema"
import { AnimatedScoreRing } from "@/components/ui/AnimatedScoreRing"
import { AuditProgress } from "./AuditProgress"
import { RerunButton } from "./RerunButton"
import { ShareButton } from "./ShareButton"
import { ExpandableIssue } from "./ExpandableIssue"
import { BulkFixButton } from "./BulkFixButton"
import { CopyIssuesButton } from "./CopyIssuesButton"
import { AiTitleSuggester } from "./AiTitleSuggester"
import { PageSpeedPanel } from "@/app/(dashboard)/sites/[id]/PageSpeedPanel"
import { PrintButton } from "./PrintButton"

export const metadata: Metadata = { title: "Audit Results" }

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sev?: string; cat?: string; status?: string; sort?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const sp = await searchParams
  const sevFilter = sp.sev ?? null
  const catFilter = sp.cat ?? null
  const statusFilter = sp.status ?? null  // "open" | "fixed" | "quick" | null
  const sortBy = sp.sort ?? null  // "priority" | "effort" | null
  const audit = await getAuditById(id)
  if (!audit) notFound()

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) notFound()

  const [summary, issues, siteAudits] = await Promise.all([
    getHealthSummary(id),
    getIssuesByAudit(id, { limit: 200 }),
    getAuditsForSite(audit.siteId, 5),
  ])

  // Find the previous completed audit before this one
  const prevAudit = siteAudits.find(a => a.id !== id && a.status === "complete" && a.healthScore != null)
  const scoreDelta = audit.healthScore != null && prevAudit?.healthScore != null
    ? audit.healthScore - prevAudit.healthScore
    : null

  // Issue trend vs previous audit
  let prevIssueCount: number | null = null
  if (prevAudit) {
    const prevIssues = await getIssuesByAudit(prevAudit.id, { limit: 200 })
    prevIssueCount = prevIssues.length
  }
  const issueDelta = prevIssueCount != null ? issues.length - prevIssueCount : null

  const pageAnalyses = (audit.pageAnalyses as PageAnalysis[] | null) ?? []
  const sortedPages = [...pageAnalyses].sort((a, b) => a.onPageScore - b.onPageScore).slice(0, 30)

  const fixedIssues = issues.filter(i => i.isFixed).length
  const fixPct = issues.length > 0 ? Math.round((fixedIssues / issues.length) * 100) : 0

  // Fix time estimates per issue type
  const FIX_TIME: Record<string, string> = {
    missing_title_tag: "5 min", missing_h1: "5 min", missing_meta_description: "5 min",
    title_too_long: "2 min", title_too_short: "2 min", meta_description_too_long: "2 min",
    multiple_h1_tags: "10 min", no_canonical_tag: "15 min", duplicate_title: "30 min",
    duplicate_meta_description: "30 min", broken_internal_link: "30 min",
    thin_content: "2 h", poor_internal_linking: "1 h", no_heading_hierarchy: "30 min",
    images_missing_alt: "1 h", missing_schema_markup: "2 h", no_schema_markup: "2 h",
    redirect_chain: "1 h", robots_noindex: "30 min", noindex_page: "15 min",
    orphan_page: "1 h", orphaned_page: "1 h", mixed_content_links: "30 min",
  }

  // Total fix time estimate for unfixed issues
  function parseMinutes(label: string): number {
    if (label.endsWith("min")) return parseInt(label)
    if (label.endsWith("h")) return parseInt(label) * 60
    return 0
  }
  const unfixedIssues = issues.filter(i => !i.isFixed)
  const totalFixMinutes = unfixedIssues.reduce((sum, i) => sum + parseMinutes(FIX_TIME[i.type] ?? "0"), 0)
  const totalFixLabel = totalFixMinutes === 0 ? null : totalFixMinutes < 60 ? `${totalFixMinutes} min` : `${Math.round(totalFixMinutes / 60 * 10) / 10} h`

  // Opportunity pages: low score but indexable (not noindex) — most to gain from fixes
  const opportunityPages = [...pageAnalyses]
    .filter(p => !p.isNoindex && p.onPageScore < 80 && p.onPageScore > 0)
    .sort((a, b) => {
      // Prioritize pages with incoming links + low score (high visibility, low quality)
      const aScore = a.incomingInternalLinks * (80 - a.onPageScore)
      const bScore = b.incomingInternalLinks * (80 - b.onPageScore)
      return bScore - aScore
    })
    .slice(0, 5)

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1100px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link href="/dashboard" style={{ fontSize: "12px", color: "oklch(0.38 0.008 230)", textDecoration: "none" }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.5px", marginTop: "8px", marginBottom: "4px" }}>
          {site.displayName ?? site.domain}
        </h1>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "oklch(0.38 0.008 230)" }}>{site.domain}</span>
            <StatusBadge status={audit.status} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {audit.status === "complete" && <RerunButton siteId={audit.siteId} />}
            {audit.status === "complete" && <ShareButton auditId={id} initialToken={audit.shareToken ?? null} />}
            {audit.status === "complete" && audit.healthScore != null && (
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just ran an SEO audit on ${site.domain} with RankIQ — health score: ${audit.healthScore}/100. Check yours: https://rankiq.app`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "7px 12px", fontSize: "12px", fontWeight: 600,
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)", color: "var(--foreground-3)", textDecoration: "none",
                }}>
                𝕏 Share
              </a>
            )}
            {audit.status === "complete" && (
              <>
                <a
                  href={`/api/v1/audits/${id}/issues/csv`}
                  download
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "7px 12px", fontSize: "12px", fontWeight: 600,
                    background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)", color: "var(--foreground-3)",
                    textDecoration: "none",
                  }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 1v6M3.5 5.5l2 2 2-2M1 9.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  CSV
                </a>
                <a
                  href={`/api/v1/audits/${id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", fontSize: "12px", fontWeight: 600,
                    background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)", color: "var(--foreground-2)",
                    textDecoration: "none",
                  }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v7M4 6l2.5 2.5L9 6M2 11h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  PDF
                </a>
              </>
            )}
            {audit.status === "complete" && (
              <>
                <a
                  href={`/api/v1/audits/${id}/pages-export`}
                  download
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", fontSize: "12px", fontWeight: 600,
                    background: "var(--glass-bg)", color: "var(--foreground-2)",
                    border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                  }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Pages CSV
                </a>
                <a
                  href={`/api/v1/audits/${id}/export`}
                  download
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", fontSize: "12px", fontWeight: 600,
                    background: "var(--glass-bg)", color: "var(--foreground-2)",
                    border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                  }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Export JSON
                </a>
              </>
            )}
            {audit.status === "complete" && (
              <PrintButton />
            )}
            <Link
              href={`/audits/${id}/action-plan`}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "7px 14px", fontSize: "12px", fontWeight: 700,
                background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
                color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
                textDecoration: "none", boxShadow: "var(--shadow-glow)",
              }}>
              View Action Plan →
            </Link>
          </div>
        </div>
      </div>

      {/* Live progress bar + auto-refresh when running or queued */}
      {(audit.status === "queued" || audit.status === "running") && (
        <AuditProgress auditId={id} initialStatus={audit.status} />
      )}

      {/* Failed state */}
      {audit.status === "failed" && (
        <div style={{ padding: "20px 24px", background: "oklch(0.14 0.07 27 / 0.8)", border: "1px solid oklch(0.55 0.20 27 / 0.3)", borderRadius: "12px", marginBottom: "32px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "oklch(0.78 0.20 27)", marginBottom: "8px" }}>⚠ Crawl Failed</div>
          <p style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)", lineHeight: 1.6, margin: 0 }}>
            {audit.errorMessage ?? "The site could not be crawled."}
          </p>
          <p style={{ fontSize: "12px", color: "oklch(0.45 0.008 230)", marginTop: "12px", marginBottom: 0 }}>
            Common causes: JavaScript-only rendering (React/Next.js/Vue apps), bot protection (Cloudflare), or the site being unreachable. Try running the audit again or contact support.
          </p>
        </div>
      )}

      {/* Audit highlights — 3 key facts */}
      {audit.status === "complete" && audit.healthScore != null && (() => {
        const topIssue = issues.filter(i => !i.isFixed).sort((a, b) => (a.severity === "critical" ? -1 : 1))[0]
        const bestPage = [...pageAnalyses].sort((a, b) => b.onPageScore - a.onPageScore)[0]
        const worstPage = [...pageAnalyses].filter(p => !p.isNoindex).sort((a, b) => a.onPageScore - b.onPageScore)[0]
        const highlights = [
          topIssue ? { label: "Top priority", value: topIssue.title, color: topIssue.severity === "critical" ? "var(--destructive)" : "var(--warning)" } : null,
          bestPage ? { label: "Best page", value: bestPage.url.replace(/^https?:\/\/[^/]+/, "") || "/", color: "var(--success)" } : null,
          worstPage ? { label: "Needs most work", value: worstPage.url.replace(/^https?:\/\/[^/]+/, "") || "/", color: "var(--warning)" } : null,
        ].filter(Boolean) as Array<{ label: string; value: string; color: string }>
        if (highlights.length === 0) return null
        return (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${highlights.length}, 1fr)`, gap: "10px", marginBottom: "20px" }}>
            {highlights.map(h => (
              <div key={h.label} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "12px 16px", overflow: "hidden" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{h.label}</div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: h.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.value}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Fixed issues progress bar */}
      {audit.status === "complete" && issues.length > 0 && (
        <div style={{
          background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-lg)", padding: "12px 20px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "16px",
        }}>
          <div style={{ fontSize: "11px", color: "var(--foreground-3)", whiteSpace: "nowrap" }}>
            Fix progress
          </div>
          <div style={{ flex: 1, height: "6px", background: "oklch(0.18 0.008 230)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${fixPct}%`,
              background: fixPct === 100 ? "var(--success)" : fixPct > 50 ? "var(--primary)" : "var(--warning)",
              borderRadius: "3px", transition: "width 600ms ease",
            }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground-2)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
              {fixedIssues}/{issues.length} fixed ({fixPct}%)
            </div>
            {totalFixLabel && (
              <div style={{ fontSize: "10px", color: "var(--foreground-3)", whiteSpace: "nowrap" }}>
                ~{totalFixLabel} remaining
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score + counts row */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "20px", marginBottom: "40px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <AnimatedScoreRing score={audit.healthScore ?? 0} size={160} />
          {scoreDelta !== null && (
            <span style={{
              fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px",
              background: scoreDelta > 0 ? "var(--success-bg)" : scoreDelta < 0 ? "var(--destructive-bg)" : "var(--glass-bg)",
              color: scoreDelta > 0 ? "var(--success)" : scoreDelta < 0 ? "var(--destructive)" : "var(--foreground-3)",
              border: `1px solid ${scoreDelta > 0 ? "var(--success)" : scoreDelta < 0 ? "var(--destructive)" : "var(--glass-border)"}20`,
              fontFamily: "var(--font-mono)",
            }}>
              {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta === 0 ? "No change" : `${scoreDelta}`} vs prev
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", alignContent: "start" }}>
          <StatCard label="Critical" value={summary.criticalCount} color="oklch(0.65 0.20 27)" />
          <StatCard label="Warnings" value={summary.warningCount} color="oklch(0.80 0.15 75)" />
          <StatCard label="Info" value={summary.infoCount} color="oklch(0.70 0.12 230)" />
          <StatCard label="Pages crawled" value={audit.pagesCount ?? 0} color="oklch(0.65 0.008 230)" />
          <StatCard label="Issues found" value={summary.totalCount} color="oklch(0.65 0.008 230)" sub={issueDelta != null ? (issueDelta > 0 ? `↑ ${issueDelta} vs prev` : issueDelta < 0 ? `↓ ${Math.abs(issueDelta)} vs prev` : "Same as prev") : undefined} subColor={issueDelta != null ? (issueDelta > 0 ? "var(--destructive)" : issueDelta < 0 ? "var(--success)" : "var(--foreground-3)") : undefined} />
          <StatCard label="Avg on-page score" value={pageAnalyses.length > 0 ? Math.round(pageAnalyses.reduce((s, p) => s + p.onPageScore, 0) / pageAnalyses.length) : 0} color="oklch(0.68 0.16 155)" suffix="/100" />
          {pageAnalyses.length > 0 && (() => {
            const totalWords = pageAnalyses.reduce((s, p) => s + (p.wordCount ?? 0), 0)
            return <StatCard label="Total word count" value={totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords} color="oklch(0.55 0.13 178)" />
          })()}
        </div>
      </div>

      {/* Category breakdown + Priority matrix */}
      {audit.status === "complete" && issues.length > 0 && (
        <>
          <CategoryBreakdown issues={issues} auditId={id} />

          {/* Priority matrix: severity × fix time */}
          {issues.filter(i => !i.isFixed).length > 0 && (() => {
          function parseMin(label: string | undefined): number {
            if (!label) return 999
            if (label.endsWith("min")) return parseInt(label)
            if (label.endsWith("h")) return parseInt(label) * 60
            return 999
          }
          const open = issues.filter(i => !i.isFixed)
          const FT: Record<string, string> = {
            missing_title_tag: "5 min", missing_h1: "5 min", missing_meta_description: "5 min",
            title_too_long: "2 min", title_too_short: "2 min", meta_description_too_long: "2 min",
            multiple_h1_tags: "10 min", no_canonical_tag: "15 min", noindex_page: "15 min",
            thin_content: "2 h", poor_internal_linking: "1 h", images_missing_alt: "1 h",
            missing_schema_markup: "2 h", no_schema_markup: "2 h", broken_internal_link: "30 min",
            redirect_chain: "1 h", robots_noindex: "30 min", orphan_page: "1 h",
          }
          const quick = open.filter(i => parseMin(FT[i.type]) <= 15)
          const quickCrit = quick.filter(i => i.severity === "critical")
          const quickWarn = quick.filter(i => i.severity !== "critical")
          const slow = open.filter(i => parseMin(FT[i.type]) > 15)
          const slowCrit = slow.filter(i => i.severity === "critical")
          const slowWarn = slow.filter(i => i.severity !== "critical")
          const cells = [
            { label: "Do first", sub: "Critical + quick", items: quickCrit, accent: "var(--destructive)", bg: "oklch(0.14 0.05 27 / 0.4)" },
            { label: "Schedule", sub: "Critical + slow", items: slowCrit, accent: "var(--warning)", bg: "oklch(0.14 0.04 70 / 0.3)" },
            { label: "Quick wins", sub: "Non-critical + quick", items: quickWarn, accent: "var(--primary-2)", bg: "oklch(0.14 0.04 196 / 0.3)" },
            { label: "Later", sub: "Non-critical + slow", items: slowWarn, accent: "var(--foreground-3)", bg: "oklch(0.15 0.006 230 / 0.5)" },
          ]
          return (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                Issue priority matrix
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {cells.map(cell => (
                  <div key={cell.label} style={{ background: cell.bg, border: `1px solid ${cell.accent}40`, borderRadius: "var(--radius-xl)", padding: "12px 16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: cell.accent, marginBottom: "2px" }}>{cell.label}</div>
                    <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginBottom: "6px" }}>{cell.sub}</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: cell.accent, fontFamily: "var(--font-mono)" }}>{cell.items.length}</div>
                  </div>
                ))}
              </div>
            </div>
          )
          })()}
        </>
      )}

      {/* Content quality strip */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const withWords = pageAnalyses.filter(p => (p.wordCount ?? 0) > 0)
        const avgWords = withWords.length > 0 ? Math.round(withWords.reduce((s, p) => s + (p.wordCount ?? 0), 0) / withWords.length) : 0
        const pagesWithH2 = pageAnalyses.filter(p => p.h2Count > 0)
        const pagesWithH1 = pageAnalyses.filter(p => p.h1Text)
        const uniqueH1s = new Set(pagesWithH1.map(p => p.h1Text?.toLowerCase().trim())).size
        const h1DiversityPct = pagesWithH1.length > 0 ? Math.round(uniqueH1s / pagesWithH1.length * 100) : 100
        const avgWordsPerH2Section = pagesWithH2.length > 0 ? Math.round(pagesWithH2.reduce((s, p) => s + Math.round(p.wordCount / Math.max(p.h2Count, 1)), 0) / pagesWithH2.length) : 0
        const avgH2Count = pageAnalyses.length > 0 ? (pageAnalyses.reduce((s, p) => s + p.h2Count, 0) / pageAnalyses.length).toFixed(1) : "0"
        const sortedByWords = [...withWords].sort((a, b) => (a.wordCount ?? 0) - (b.wordCount ?? 0))
        const medianWordCount = sortedByWords.length > 0 ? (sortedByWords[Math.floor(sortedByWords.length / 2)]?.wordCount ?? 0) : 0
        const thin = pageAnalyses.filter(p => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < 300).length
        const rich = pageAnalyses.filter(p => (p.wordCount ?? 0) >= 600).length
        const withSchema = pageAnalyses.filter(p => p.hasJsonLd).length
        const withCanonical = pageAnalyses.filter(p => p.hasCanonical).length
        const withImgAlt = pageAnalyses.filter(p => (p.imagesMissingAlt ?? 0) > 0).length
        const withInternalLinks = pageAnalyses.filter(p => p.internalLinkCount > 0).length
        const avgIncomingLinks = Math.round(pageAnalyses.reduce((s, p) => s + (p.incomingInternalLinks ?? 0), 0) / pageAnalyses.length)
        const excellentPages = pageAnalyses.filter(p => p.onPageScore >= 90).length
        const poorPages = pageAnalyses.filter(p => p.onPageScore < 50).length
        const avgCrawlDepth = pageAnalyses.length > 0 ? (pageAnalyses.reduce((s, p) => s + (p.url.split("/").length - 3), 0) / pageAnalyses.length).toFixed(1) : null
        const metadataPerfect = pageAnalyses.filter(p => p.title && p.title.length >= 30 && p.title.length <= 60 && p.metaDescription && p.metaDescription.length >= 120 && p.metaDescription.length <= 160 && !p.isNoindex).length
        const avgH1Length = pagesWithH1.length > 0 ? Math.round(pagesWithH1.reduce((s, p) => s + (p.h1Text?.length ?? 0), 0) / pagesWithH1.length) : null
        const metadataQualityPct = pageAnalyses.length > 0 ? Math.round(metadataPerfect / pageAnalyses.length * 100) : 0
        const longPagesNoH3 = pageAnalyses.filter(p => p.wordCount >= 1000 && p.h3Count === 0 && !p.isNoindex).length
        const richPagesNoH3 = pageAnalyses.filter(p => !p.isNoindex && p.wordCount >= 600 && (p.h3Count ?? 0) === 0)
        const richPagesTotal = pageAnalyses.filter(p => !p.isNoindex && p.wordCount >= 600)
        const h3CoveragePct = richPagesTotal.length > 0 ? Math.round((richPagesTotal.length - richPagesNoH3.length) / richPagesTotal.length * 100) : 100
        const noindexCount = pageAnalyses.filter(p => p.isNoindex).length
        const noindexRatioPct = pageAnalyses.length > 0 ? Math.round(noindexCount / pageAnalyses.length * 100) : 0
        const totalImages = pageAnalyses.reduce((s, p) => s + (p.imageCount ?? 0), 0)
        const totalMissingAlt = pageAnalyses.reduce((s, p) => s + (p.imagesMissingAlt ?? 0), 0)
        const imgAltCoveragePct = totalImages > 0 ? Math.round((1 - totalMissingAlt / totalImages) * 100) : 100
        const pct = (n: number) => `${Math.round(n / pageAnalyses.length * 100)}%`
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
            {[
              { label: "Avg word count", value: avgWords.toLocaleString(), sub: "per page", color: avgWords > 500 ? "var(--success)" : avgWords > 200 ? "var(--warning)" : "var(--destructive)" },
              ...(medianWordCount > 0 ? [{ label: "Median word count", value: medianWordCount.toLocaleString(), sub: "per page", color: medianWordCount > 400 ? "var(--success)" : medianWordCount > 200 ? "var(--warning)" : "var(--destructive)" }] : []),
              ...(avgWordsPerH2Section > 0 ? [{ label: "Avg words/section", value: avgWordsPerH2Section.toLocaleString(), sub: "per H2", color: avgWordsPerH2Section > 150 ? "var(--success)" : "var(--warning)" }] : []),
              { label: "Avg H2 count", value: avgH2Count, sub: "per page", color: parseFloat(avgH2Count) >= 2 ? "var(--success)" : parseFloat(avgH2Count) >= 1 ? "var(--primary-2)" : "var(--warning)" },
              ...(pagesWithH1.length > 1 ? [{ label: "H1 diversity", value: `${h1DiversityPct}%`, sub: `${uniqueH1s}/${pagesWithH1.length} unique`, color: h1DiversityPct >= 95 ? "var(--success)" : h1DiversityPct >= 80 ? "var(--warning)" : "var(--destructive)" }] : []),
              { label: "Thin pages (<300w)", value: thin.toString(), sub: `${pct(thin)} of pages`, color: thin === 0 ? "var(--success)" : thin < pageAnalyses.length * 0.2 ? "var(--warning)" : "var(--destructive)" },
              { label: "Rich pages (600w+)", value: rich.toString(), sub: `${pct(rich)} of pages`, color: "var(--success)" },
              { label: "JSON-LD schema", value: withSchema.toString(), sub: `${pct(withSchema)} coverage`, color: withSchema > 0 ? "var(--primary-2)" : "var(--destructive)" },
              { label: "Canonical tags", value: withCanonical.toString(), sub: `${pct(withCanonical)} coverage`, color: withCanonical === pageAnalyses.length ? "var(--success)" : "var(--warning)" },
              { label: "Images w/o alt", value: withImgAlt.toString(), sub: `page${withImgAlt !== 1 ? "s" : ""} affected`, color: withImgAlt === 0 ? "var(--success)" : "var(--destructive)" },
              { label: "Pages w/ int. links", value: withInternalLinks.toString(), sub: `${pct(withInternalLinks)} of pages`, color: withInternalLinks > pageAnalyses.length * 0.8 ? "var(--success)" : "var(--warning)" },
              ...(avgIncomingLinks > 0 ? [{ label: "Avg link equity", value: avgIncomingLinks.toString(), sub: "incoming/page", color: avgIncomingLinks >= 3 ? "var(--success)" : avgIncomingLinks >= 1 ? "var(--warning)" : "var(--destructive)" }] : []),
              { label: "Excellent pages (90+)", value: excellentPages.toString(), sub: `${pct(excellentPages)} of pages`, color: excellentPages > 0 ? "var(--success)" : "var(--foreground-3)" },
              ...(poorPages > 0 ? [{ label: "Poor pages (<50)", value: poorPages.toString(), sub: `${pct(poorPages)} of pages`, color: "var(--destructive)" }] : []),
              ...(avgCrawlDepth != null ? [{ label: "Avg crawl depth", value: avgCrawlDepth.toString(), sub: "URL segments deep", color: parseFloat(avgCrawlDepth) <= 3 ? "var(--success)" : parseFloat(avgCrawlDepth) <= 5 ? "var(--warning)" : "var(--destructive)" }] : []),
              { label: "Metadata quality", value: `${metadataQualityPct}%`, sub: `${metadataPerfect} pages perfect`, color: metadataQualityPct >= 70 ? "var(--success)" : metadataQualityPct >= 40 ? "var(--warning)" : "var(--destructive)" },
              ...(longPagesNoH3 > 0 ? [{ label: "Long pages no H3", value: longPagesNoH3.toString(), sub: "1000w+ missing H3", color: "var(--warning)" }] : []),
              ...(richPagesTotal.length > 0 ? [{ label: "H3 coverage", value: `${h3CoveragePct}%`, sub: "of 600w+ pages", color: h3CoveragePct >= 80 ? "var(--success)" : h3CoveragePct >= 50 ? "var(--warning)" : "var(--destructive)" }] : []),
              ...(noindexCount > 0 ? [{ label: "Noindex pages", value: noindexCount.toString(), sub: `${noindexRatioPct}% of crawl`, color: noindexRatioPct > 40 ? "var(--destructive)" : noindexRatioPct > 20 ? "var(--warning)" : "var(--foreground-3)" }] : []),
              ...(totalImages > 0 ? [{ label: "Image alt coverage", value: `${imgAltCoveragePct}%`, sub: `${totalMissingAlt} images missing`, color: imgAltCoveragePct >= 95 ? "var(--success)" : imgAltCoveragePct >= 80 ? "var(--warning)" : "var(--destructive)" }] : []),
              { label: "Avg internal links", value: pageAnalyses.length > 0 ? Math.round(pageAnalyses.reduce((s, p) => s + p.internalLinkCount, 0) / pageAnalyses.length).toString() : "0", sub: "per page", color: "var(--primary-2)" },
              ...(totalImages > 0 ? [{ label: "Avg images/page", value: (totalImages / pageAnalyses.length).toFixed(1), sub: `${totalImages} total`, color: "var(--primary-2)" }] : []),
              ...((() => { const contentPages = pageAnalyses.filter(p => !p.isNoindex && (p.wordCount ?? 0) >= 300); const withH2 = contentPages.filter(p => p.h2Count > 0); const h2Pct = contentPages.length > 0 ? Math.round(withH2.length / contentPages.length * 100) : 100; return contentPages.length > 0 ? [{ label: "H2 coverage", value: `${h2Pct}%`, sub: `of 300w+ pages`, color: h2Pct >= 80 ? "var(--success)" : h2Pct >= 60 ? "var(--warning)" : "var(--destructive)" }] : [] })()),
              ...(avgH1Length != null ? [{ label: "Avg H1 length", value: `${avgH1Length}ch`, sub: "ideal: 20–70", color: avgH1Length >= 20 && avgH1Length <= 70 ? "var(--success)" : "var(--warning)" }] : []),
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "12px 16px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
                <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginTop: "3px" }}>{sub}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Thin content pages list */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const thinPages = pageAnalyses
          .filter(p => (p.wordCount ?? 0) > 0 && (p.wordCount ?? 0) < 300 && !p.isNoindex)
          .sort((a, b) => (a.wordCount ?? 0) - (b.wordCount ?? 0))
          .slice(0, 8)
        if (thinPages.length < 2) return null
        return (
          <div style={{ background: "oklch(0.14 0.05 50 / 0.2)", border: "1px solid oklch(0.70 0.15 50 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.78 0.13 50)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Thin content pages — fewer than 300 words (top {thinPages.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {thinPages.map(p => (
                <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                  <span style={{ color: "oklch(0.78 0.13 50)", fontWeight: 700, flexShrink: 0 }}>{p.wordCount ?? 0}w</span>
                  <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>score {p.onPageScore}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Content pillars — richest pages */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const rich = pageAnalyses.filter(p => !p.isNoindex && (p.wordCount ?? 0) >= 800)
          .sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))
          .slice(0, 5)
        if (rich.length < 3) return null
        return (
          <div style={{ background: "oklch(0.14 0.06 155 / 0.1)", border: "1px solid oklch(0.68 0.16 155 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Content pillars — top {rich.length} richest pages
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {rich.map(p => (
                <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                  <span style={{ color: "var(--success)", fontWeight: 700, flexShrink: 0 }}>{(p.wordCount ?? 0).toLocaleString()}w</span>
                  <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>score {p.onPageScore}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Missing canonicals list */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const noCanonical = pageAnalyses.filter(p => !p.hasCanonical && !p.isNoindex).slice(0, 8)
        if (noCanonical.length < 2) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 270 / 0.15)", border: "1px solid oklch(0.60 0.10 270 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.70 0.12 270)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Missing canonical tags — {pageAnalyses.filter(p => !p.hasCanonical && !p.isNoindex).length} pages
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {noCanonical.map(p => (
                <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                  <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>score {p.onPageScore}</span>
                </div>
              ))}
              {pageAnalyses.filter(p => !p.hasCanonical && !p.isNoindex).length > 8 && (
                <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>+{pageAnalyses.filter(p => !p.hasCanonical && !p.isNoindex).length - 8} more</span>
              )}
            </div>
          </div>
        )
      })()}

      {/* Pages with no outgoing internal links — isolated pages */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const isolated = pageAnalyses
          .filter(p => !p.isNoindex && p.internalLinkCount === 0 && (p.wordCount ?? 0) >= 200)
          .sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))
          .slice(0, 6)
        if (isolated.length < 2) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 270 / 0.15)", border: "1px solid oklch(0.60 0.10 270 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.70 0.12 270)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Pages with no outgoing internal links — add links to improve crawlability
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {isolated.map(p => (
                <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                  <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{p.wordCount?.toLocaleString()}w</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Broken internal links quick list */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const brokenPages = pageAnalyses
          .filter(p => (p.issueTypes ?? []).includes("broken_internal_link") && !p.isNoindex)
          .slice(0, 8)
        if (brokenPages.length === 0) return null
        return (
          <div style={{ background: "oklch(0.14 0.05 27 / 0.2)", border: "1px solid oklch(0.65 0.20 27 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Pages with broken internal links
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {brokenPages.map(p => (
                <div key={p.url} style={{ fontSize: "11px", color: "var(--foreground-2)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}
                </div>
              ))}
              {pageAnalyses.filter(p => (p.issueTypes ?? []).includes("broken_internal_link")).length > 8 && (
                <div style={{ fontSize: "10px", color: "var(--foreground-3)" }}>+{pageAnalyses.filter(p => (p.issueTypes ?? []).includes("broken_internal_link")).length - 8} more pages</div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Meta description quality breakdown */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const indexable = pageAnalyses.filter(p => !p.isNoindex)
        const missing = indexable.filter(p => !p.metaDescription)
        const tooShort = indexable.filter(p => p.metaDescription && p.metaDescription.length < 70)
        const tooLong = indexable.filter(p => p.metaDescription && p.metaDescription.length > 160)
        const perfect = indexable.filter(p => p.metaDescription && p.metaDescription.length >= 70 && p.metaDescription.length <= 160)
        if (indexable.length === 0 || (missing.length === 0 && tooShort.length === 0 && tooLong.length === 0)) return null
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Meta description quality
            </div>
            <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              {missing.length > 0 && <div style={{ flex: missing.length, background: "var(--destructive)", minWidth: "4px" }} title={`Missing: ${missing.length}`} />}
              {tooShort.length > 0 && <div style={{ flex: tooShort.length, background: "var(--warning)", minWidth: "4px" }} title={`Too short: ${tooShort.length}`} />}
              {tooLong.length > 0 && <div style={{ flex: tooLong.length, background: "oklch(0.70 0.15 50)", minWidth: "4px" }} title={`Too long: ${tooLong.length}`} />}
              {perfect.length > 0 && <div style={{ flex: perfect.length, background: "var(--success)", minWidth: "4px" }} title={`Perfect: ${perfect.length}`} />}
            </div>
            <div style={{ display: "flex", gap: "16px", fontSize: "10px" }}>
              {missing.length > 0 && <span style={{ color: "var(--destructive)" }}><strong>{missing.length}</strong> missing</span>}
              {tooShort.length > 0 && <span style={{ color: "var(--warning)" }}><strong>{tooShort.length}</strong> too short</span>}
              {tooLong.length > 0 && <span style={{ color: "oklch(0.70 0.15 50)" }}><strong>{tooLong.length}</strong> too long</span>}
              {perfect.length > 0 && <span style={{ color: "var(--success)" }}><strong>{perfect.length}</strong> perfect</span>}
            </div>
          </div>
        )
      })()}

      {/* Word count distribution */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const indexable = pageAnalyses.filter(p => !p.isNoindex && (p.wordCount ?? 0) > 0)
        if (indexable.length < 5) return null
        const buckets = [
          { label: "<100", count: indexable.filter(p => (p.wordCount ?? 0) < 100).length, color: "var(--destructive)" },
          { label: "100–300", count: indexable.filter(p => { const w = p.wordCount ?? 0; return w >= 100 && w < 300 }).length, color: "var(--warning)" },
          { label: "300–600", count: indexable.filter(p => { const w = p.wordCount ?? 0; return w >= 300 && w < 600 }).length, color: "oklch(0.70 0.15 50)" },
          { label: "600–1500", count: indexable.filter(p => { const w = p.wordCount ?? 0; return w >= 600 && w < 1500 }).length, color: "var(--primary-2)" },
          { label: "1500+", count: indexable.filter(p => (p.wordCount ?? 0) >= 1500).length, color: "var(--success)" },
        ].filter(b => b.count > 0)
        if (buckets.length < 2) return null
        const max = Math.max(...buckets.map(b => b.count))
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Word count distribution — {indexable.length} indexed pages
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "52px" }}>
              {buckets.map(b => (
                <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                  <div style={{ background: b.color, width: "100%", height: `${Math.round(b.count / max * 40)}px`, borderRadius: "2px 2px 0 0", minHeight: "4px" }} />
                  <div style={{ fontSize: "9px", color: "var(--foreground-3)", fontWeight: 700, textAlign: "center" }}>{b.label}</div>
                  <div style={{ fontSize: "9px", color: b.color, fontWeight: 700 }}>{b.count}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Word count vs score correlation insight */}
      {pageAnalyses.length >= 10 && audit.status === "complete" && (() => {
        const indexable = pageAnalyses.filter(p => !p.isNoindex && (p.wordCount ?? 0) >= 100)
        if (indexable.length < 5) return null
        const rich = indexable.filter(p => (p.wordCount ?? 0) >= 600)
        const thin = indexable.filter(p => (p.wordCount ?? 0) < 300)
        if (rich.length === 0 || thin.length === 0) return null
        const richAvgScore = Math.round(rich.reduce((s, p) => s + p.onPageScore, 0) / rich.length)
        const thinAvgScore = Math.round(thin.reduce((s, p) => s + p.onPageScore, 0) / thin.length)
        const diff = richAvgScore - thinAvgScore
        if (Math.abs(diff) < 3) return null
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "12px 18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontSize: "18px", flexShrink: 0 }}>💡</div>
            <div style={{ fontSize: "12px", color: "var(--foreground-2)" }}>
              Your 600w+ pages score <strong style={{ color: diff > 0 ? "var(--success)" : "var(--destructive)" }}>{diff > 0 ? "+" : ""}{diff} pts higher</strong> on average than thin pages (&lt;300w).{" "}
              {diff > 0 ? "Adding more content to thin pages may improve their scores." : "Focus on quality over quantity for your shorter pages."}
            </div>
          </div>
        )
      })()}

      {/* Longest pages — top word count, possible candidates for content splitting */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const longest = [...pageAnalyses]
          .filter(p => !p.isNoindex && (p.wordCount ?? 0) > 1500)
          .sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))
          .slice(0, 6)
        if (longest.length < 2) return null
        const maxWords = longest[0]!.wordCount ?? 1
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Longest pages (1500w+) — consider splitting or adding a summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {longest.map(p => (
                <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                  <span style={{ color: "var(--primary-2)", fontWeight: 700, flexShrink: 0, fontFamily: "var(--font-mono)" }}>{(p.wordCount ?? 0).toLocaleString()}w</span>
                  <div style={{ width: "60px", height: "3px", background: "var(--border)", borderRadius: "2px", flexShrink: 0 }}>
                    <div style={{ width: `${Math.round((p.wordCount ?? 0) / maxWords * 100)}%`, height: "100%", background: "var(--primary-2)", borderRadius: "2px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* URL depth distribution */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const indexable = pageAnalyses.filter(p => !p.isNoindex)
        if (indexable.length < 5) return null
        const depths = indexable.map(p => { try { return new URL(p.url).pathname.split("/").filter(Boolean).length } catch { return 1 } })
        const d1 = depths.filter(d => d <= 1).length
        const d2 = depths.filter(d => d === 2).length
        const d3 = depths.filter(d => d === 3).length
        const d4 = depths.filter(d => d >= 4).length
        const buckets = [
          { label: "Depth 1", count: d1, color: "var(--success)" },
          { label: "Depth 2", count: d2, color: "var(--primary-2)" },
          { label: "Depth 3", count: d3, color: "var(--warning)" },
          { label: "Depth 4+", count: d4, color: "var(--destructive)" },
        ].filter(b => b.count > 0)
        const maxCount = Math.max(...buckets.map(b => b.count), 1)
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>URL depth distribution</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {buckets.map(b => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ width: "55px", color: "var(--foreground-3)", flexShrink: 0 }}>{b.label}</span>
                  <div style={{ flex: 1, height: "8px", background: "var(--glass-border)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.round(b.count / maxCount * 100)}%`, height: "100%", background: b.color, borderRadius: "4px", minWidth: "4px" }} />
                  </div>
                  <span style={{ width: "35px", textAlign: "right", color: b.color, fontWeight: 700, fontFamily: "var(--font-mono)", flexShrink: 0 }}>{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Title quality overview */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const indexable = pageAnalyses.filter(p => !p.isNoindex)
        if (indexable.length === 0) return null
        const missing = indexable.filter(p => !p.title)
        const tooShort = indexable.filter(p => p.title && p.titleLength < 30)
        const tooLong = indexable.filter(p => p.title && p.titleLength > 60)
        const optimal = indexable.filter(p => p.title && p.titleLength >= 30 && p.titleLength <= 60)
        // Count duplicate titles
        const titleMap2 = new Map<string, number>()
        for (const p of indexable) { if (p.title) titleMap2.set(p.title.toLowerCase(), (titleMap2.get(p.title.toLowerCase()) ?? 0) + 1) }
        const dupTitleCount = [...titleMap2.values()].filter(c => c > 1).reduce((s, c) => s + c, 0)
        if (missing.length === 0 && tooShort.length === 0 && tooLong.length === 0) return null
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Page title quality
            </div>
            <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              {missing.length > 0 && <div style={{ flex: missing.length, background: "var(--destructive)", minWidth: "4px" }} />}
              {tooShort.length > 0 && <div style={{ flex: tooShort.length, background: "var(--warning)", minWidth: "4px" }} />}
              {tooLong.length > 0 && <div style={{ flex: tooLong.length, background: "oklch(0.70 0.15 50)", minWidth: "4px" }} />}
              {optimal.length > 0 && <div style={{ flex: optimal.length, background: "var(--success)", minWidth: "4px" }} />}
            </div>
            <div style={{ display: "flex", gap: "16px", fontSize: "10px" }}>
              {missing.length > 0 && <span style={{ color: "var(--destructive)" }}><strong>{missing.length}</strong> missing</span>}
              {tooShort.length > 0 && <span style={{ color: "var(--warning)" }}><strong>{tooShort.length}</strong> too short (&lt;30)</span>}
              {tooLong.length > 0 && <span style={{ color: "oklch(0.70 0.15 50)" }}><strong>{tooLong.length}</strong> too long (&gt;60)</span>}
              {optimal.length > 0 && <span style={{ color: "var(--success)" }}><strong>{optimal.length}</strong> optimal</span>}
              {dupTitleCount > 0 && <span style={{ color: "var(--warning)", marginLeft: "auto" }}><strong>{dupTitleCount}</strong> duplicates</span>}
            </div>
          </div>
        )
      })()}

      {/* Pages missing JSON-LD schema */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const noSchema = pageAnalyses
          .filter(p => !p.isNoindex && !p.hasJsonLd && (p.wordCount ?? 0) >= 300)
          .sort((a, b) => b.onPageScore - a.onPageScore)
          .slice(0, 6)
        if (noSchema.length < 3) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 196 / 0.2)", border: "1px solid oklch(0.55 0.13 178 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              {pageAnalyses.filter(p => !p.isNoindex && !p.hasJsonLd).length} pages missing JSON-LD schema markup
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {noSchema.map(p => (
                <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                  <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{p.wordCount?.toLocaleString()}w</span>
                </div>
              ))}
              {pageAnalyses.filter(p => !p.isNoindex && !p.hasJsonLd && (p.wordCount ?? 0) >= 300).length > 6 && (
                <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>
                  +{pageAnalyses.filter(p => !p.isNoindex && !p.hasJsonLd && (p.wordCount ?? 0) >= 300).length - 6} more
                </span>
              )}
            </div>
          </div>
        )
      })()}

      {/* Multiple H1 pages list */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const multiH1 = pageAnalyses
          .filter(p => !p.isNoindex && (p.h1Count ?? 0) > 1)
          .sort((a, b) => (b.h1Count ?? 0) - (a.h1Count ?? 0))
          .slice(0, 6)
        if (multiH1.length < 2) return null
        return (
          <div style={{ background: "oklch(0.14 0.05 70 / 0.2)", border: "1px solid oklch(0.80 0.15 75 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Pages with multiple H1 tags — should have exactly one
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {multiH1.map(p => (
                <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                  <span style={{ color: "var(--warning)", fontWeight: 700, flexShrink: 0 }}>{p.h1Count} H1s</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* H1 quality panel */}
      {pageAnalyses.length > 0 && audit.status === "complete" && (() => {
        const missingH1 = pageAnalyses.filter(p => !p.h1Text && !p.isNoindex)
        const multipleH1 = pageAnalyses.filter(p => (p.h1Count ?? 0) > 1 && !p.isNoindex)
        const h1Texts = pageAnalyses.filter(p => p.h1Text && !p.isNoindex).map(p => p.h1Text!.toLowerCase().trim())
        const h1Counts: Record<string, number> = {}
        h1Texts.forEach(t => { h1Counts[t] = (h1Counts[t] ?? 0) + 1 })
        const duplicateH1s = Object.entries(h1Counts).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 3)
        if (missingH1.length === 0 && multipleH1.length === 0 && duplicateH1s.length === 0) return null
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              H1 quality check
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {missingH1.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: "var(--destructive)", fontWeight: 700, flexShrink: 0 }}>✗ Missing H1</span>
                  <span style={{ fontSize: "11px", color: "var(--foreground-2)" }}>{missingH1.length} page{missingH1.length !== 1 ? "s" : ""} have no H1 tag</span>
                  <span style={{ fontSize: "10px", color: "var(--foreground-3)", marginLeft: "auto" }}>{missingH1.slice(0, 2).map(p => p.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 30)).join(", ")}{missingH1.length > 2 ? ` +${missingH1.length - 2} more` : ""}</span>
                </div>
              )}
              {multipleH1.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: "var(--warning)", fontWeight: 700, flexShrink: 0 }}>⚠ Multiple H1s</span>
                  <span style={{ fontSize: "11px", color: "var(--foreground-2)" }}>{multipleH1.length} page{multipleH1.length !== 1 ? "s" : ""} have more than one H1</span>
                </div>
              )}
              {duplicateH1s.length > 0 && (
                <div>
                  <span style={{ fontSize: "11px", color: "var(--warning)", fontWeight: 700 }}>⚠ Duplicate H1s: </span>
                  <span style={{ fontSize: "11px", color: "var(--foreground-2)" }}>{duplicateH1s.map(([text, n]) => `"${text.slice(0, 40)}" ×${n}`).join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {audit.status === "queued" || audit.status === "running" ? (
        <RunningState status={audit.status} />
      ) : (
        <>
          <IssuesSection issues={issues} auditId={id} sevFilter={sevFilter} catFilter={catFilter} statusFilter={statusFilter} sortBy={sortBy} totalPages={pageAnalyses.length} />
          {/* Score distribution histogram */}
          {pageAnalyses.length > 0 && (() => {
            const buckets = [
              { label: "0–19", min: 0, max: 19, color: "var(--destructive)" },
              { label: "20–39", min: 20, max: 39, color: "oklch(0.70 0.18 40)" },
              { label: "40–59", min: 40, max: 59, color: "var(--warning)" },
              { label: "60–79", min: 60, max: 79, color: "oklch(0.75 0.14 120)" },
              { label: "80–100", min: 80, max: 100, color: "var(--success)" },
            ].map(b => ({ ...b, count: pageAnalyses.filter(p => p.onPageScore >= b.min && p.onPageScore <= b.max).length }))
            const maxCount = Math.max(...buckets.map(b => b.count), 1)
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
                  On-page score distribution
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "60px" }}>
                  {buckets.map(b => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: b.color, fontFamily: "var(--font-mono)" }}>{b.count}</div>
                      <div style={{ width: "100%", height: `${Math.max((b.count / maxCount) * 44, b.count > 0 ? 4 : 0)}px`, background: b.color, borderRadius: "3px 3px 0 0", opacity: 0.8 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {buckets.map(b => (
                    <div key={b.label} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "var(--foreground-3)" }}>{b.label}</div>
                  ))}
                </div>
              </div>
            )
          })()}
          {/* Title length distribution */}
          {pageAnalyses.length > 3 && (() => {
            const withTitle = pageAnalyses.filter(p => p.title)
            const titleBuckets = [
              { label: "None", count: pageAnalyses.length - withTitle.length, color: "var(--destructive)" },
              { label: "<20", count: withTitle.filter(p => p.titleLength < 20).length, color: "var(--warning)" },
              { label: "20–60", count: withTitle.filter(p => p.titleLength >= 20 && p.titleLength <= 60).length, color: "var(--success)" },
              { label: ">60", count: withTitle.filter(p => p.titleLength > 60).length, color: "var(--warning)" },
            ]
            const maxTCount = Math.max(...titleBuckets.map(b => b.count), 1)
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
                  Title tag length distribution
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "50px" }}>
                  {titleBuckets.map(b => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: b.color, fontFamily: "var(--font-mono)" }}>{b.count}</div>
                      <div style={{ width: "100%", height: `${Math.max((b.count / maxTCount) * 36, b.count > 0 ? 4 : 0)}px`, background: b.color, borderRadius: "3px 3px 0 0", opacity: 0.8 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                  {titleBuckets.map(b => (
                    <div key={b.label} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "var(--foreground-3)" }}>{b.label}</div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Meta description length distribution */}
          {pageAnalyses.length > 0 && (() => {
            const withMeta = pageAnalyses.filter(p => p.metaDescription)
            if (withMeta.length < 3) return null
            const buckets = [
              { label: "None", count: pageAnalyses.length - withMeta.length, color: "var(--destructive)" },
              { label: "<70", count: withMeta.filter(p => p.metaDescriptionLength < 70).length, color: "var(--warning)" },
              { label: "70–160", count: withMeta.filter(p => p.metaDescriptionLength >= 70 && p.metaDescriptionLength <= 160).length, color: "var(--success)" },
              { label: ">160", count: withMeta.filter(p => p.metaDescriptionLength > 160).length, color: "var(--warning)" },
            ]
            const maxCount = Math.max(...buckets.map(b => b.count), 1)
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
                  Meta description length distribution
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "50px" }}>
                  {buckets.map(b => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: b.color, fontFamily: "var(--font-mono)" }}>{b.count}</div>
                      <div style={{ width: "100%", height: `${Math.max((b.count / maxCount) * 36, b.count > 0 ? 4 : 0)}px`, background: b.color, borderRadius: "3px 3px 0 0", opacity: 0.8 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                  {buckets.map(b => (
                    <div key={b.label} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "var(--foreground-3)" }}>{b.label}</div>
                  ))}
                </div>
              </div>
            )
          })()}
          {/* Incoming internal links distribution (link equity) */}
          {pageAnalyses.length > 0 && (() => {
            const incomingBuckets = [
              { label: "0 (orphan)", min: 0, max: 0, color: "var(--destructive)" },
              { label: "1–2", min: 1, max: 2, color: "var(--warning)" },
              { label: "3–8", min: 3, max: 8, color: "var(--primary-2)" },
              { label: "9+", min: 9, max: Infinity, color: "var(--success)" },
            ].map(b => ({
              ...b,
              count: pageAnalyses.filter(p => !p.isNoindex && (p.incomingInternalLinks ?? 0) >= b.min && (p.incomingInternalLinks ?? 0) <= b.max).length,
            }))
            const maxInc = Math.max(...incomingBuckets.map(b => b.count), 1)
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Incoming internal links per page (link equity distribution)
                </div>
                <div style={{ display: "flex", gap: "8px", height: "50px", alignItems: "flex-end" }}>
                  {incomingBuckets.map(b => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: b.color, fontFamily: "var(--font-mono)" }}>{b.count}</div>
                      <div style={{ width: "100%", height: `${Math.max((b.count / maxInc) * 36, b.count > 0 ? 4 : 0)}px`, background: b.color, borderRadius: "3px 3px 0 0", opacity: 0.8 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {incomingBuckets.map(b => (
                    <div key={b.label} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "var(--foreground-3)" }}>{b.label}</div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Internal link count distribution (outgoing) */}
          {pageAnalyses.length > 0 && (() => {
            const buckets = [
              { label: "0 links", min: 0, max: 0, color: "var(--destructive)" },
              { label: "1–3", min: 1, max: 3, color: "var(--warning)" },
              { label: "4–10", min: 4, max: 10, color: "var(--primary-2)" },
              { label: "11+", min: 11, max: Infinity, color: "var(--success)" },
            ].map(b => ({
              ...b,
              count: pageAnalyses.filter(p => !p.isNoindex && p.internalLinkCount >= b.min && p.internalLinkCount <= b.max).length,
            }))
            const maxCount = Math.max(...buckets.map(b => b.count), 1)
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Internal link distribution — outgoing links per page
                </div>
                <div style={{ display: "flex", gap: "8px", height: "50px", alignItems: "flex-end" }}>
                  {buckets.map(b => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: b.color, fontFamily: "var(--font-mono)" }}>{b.count}</div>
                      <div style={{ width: "100%", height: `${Math.max((b.count / maxCount) * 36, b.count > 0 ? 4 : 0)}px`, background: b.color, borderRadius: "3px 3px 0 0", opacity: 0.8 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {buckets.map(b => (
                    <div key={b.label} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "var(--foreground-3)" }}>{b.label}</div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Core Web Vitals */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Core Web Vitals (via PageSpeed Insights)
            </div>
            <PageSpeedPanel siteId={audit.siteId} />
          </div>

          {/* Quick top-5 "focus pages" list */}
          {sortedPages.length >= 3 && (() => {
            const focus = sortedPages.filter(p => !p.isNoindex && p.onPageScore < 70).slice(0, 5)
            if (focus.length === 0) return null
            return (
              <div style={{ background: "oklch(0.14 0.05 27 / 0.15)", border: "1px solid oklch(0.65 0.20 27 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  Pages needing the most attention (score &lt;70)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {focus.map(p => (
                    <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                      <span style={{ color: p.onPageScore < 40 ? "var(--destructive)" : "var(--warning)", fontWeight: 700, fontFamily: "var(--font-mono)", flexShrink: 0 }}>{p.onPageScore}/100</span>
                      <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{p.wordCount?.toLocaleString() ?? 0}w</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          {sortedPages.length > 0 && <PagesSection pages={sortedPages} auditId={id} />}

          {/* Internal linking opportunities */}
          {pageAnalyses.length > 5 && (() => {
            const linkOpps = pageAnalyses
              .filter(p => !p.isNoindex && p.wordCount >= 600 && p.internalLinkCount < 3)
              .sort((a, b) => b.wordCount - a.wordCount)
              .slice(0, 5)
            if (linkOpps.length < 2) return null
            return (
              <div style={{ background: "oklch(0.14 0.04 70 / 0.2)", border: "1px solid oklch(0.80 0.15 75 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  ⟶ Internal linking opportunities — content-rich pages with few outgoing links
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {linkOpps.map(p => (
                    <div key={p.url} style={{ display: "flex", gap: "10px", fontSize: "10px", color: "var(--foreground-2)" }}>
                      <span style={{ color: "var(--warning)", fontFamily: "var(--font-mono)", width: "50px", flexShrink: 0 }}>{p.wordCount}w</span>
                      <span style={{ flex: 1, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                      <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{p.internalLinkCount} links out</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Content cluster map — pages by URL prefix */}
          {pageAnalyses.length > 5 && (() => {
            const clusters = new Map<string, number>()
            for (const p of pageAnalyses) {
              try {
                const segments = new URL(p.url).pathname.split("/").filter(Boolean)
                const prefix = segments.length > 0 ? `/${segments[0]}` : "/"
                clusters.set(prefix, (clusters.get(prefix) ?? 0) + 1)
              } catch { /* ignore */ }
            }
            const sorted = [...clusters.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
            if (sorted.length < 2) return null
            const max = sorted[0]![1]
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Content clusters by URL prefix
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {sorted.map(([prefix, count]) => (
                    <div key={prefix} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--foreground-2)", width: "120px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prefix}</span>
                      <div style={{ flex: 1, height: "6px", background: "oklch(0.20 0.006 230)", borderRadius: "3px" }}>
                        <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "var(--primary)", borderRadius: "3px", opacity: 0.8 }} />
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)", width: "30px", textAlign: "right", flexShrink: 0 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Top linked pages — most internal link equity */}
          {pageAnalyses.length > 3 && (() => {
            const topLinked = [...pageAnalyses]
              .filter(p => p.incomingInternalLinks > 0)
              .sort((a, b) => b.incomingInternalLinks - a.incomingInternalLinks)
              .slice(0, 5)
            if (topLinked.length === 0) return null
            const maxLinks = topLinked[0]!.incomingInternalLinks
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Top linked pages (internal equity)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {topLinked.map(p => (
                    <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", fontFamily: "var(--font-mono)", width: "28px", flexShrink: 0 }}>{p.incomingInternalLinks}</span>
                      <div style={{ flex: 1, height: "4px", background: "oklch(0.20 0.006 230)", borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${(p.incomingInternalLinks / maxLinks) * 100}%`, background: "var(--primary)", borderRadius: "2px" }} />
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)", flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.url.replace(/^https?:\/\/[^/]+/, "")}
                      </span>
                      <span style={{ fontSize: "9px", color: p.onPageScore >= 70 ? "var(--success)" : "var(--warning)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{p.onPageScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Top 10 most-broken pages */}
          {pageAnalyses.length > 3 && (() => {
            const broken = [...pageAnalyses]
              .sort((a, b) => b.issueTypes.length - a.issueTypes.length || a.onPageScore - b.onPageScore)
              .slice(0, 10)
              .filter(p => p.issueTypes.length > 0)
            if (broken.length < 3) return null
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginTop: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Most issues per page
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {broken.map((p, i) => {
                    const barPct = broken[0]!.issueTypes.length > 0 ? (p.issueTypes.length / broken[0]!.issueTypes.length) * 100 : 0
                    const scoreColor = p.onPageScore >= 80 ? "var(--success)" : p.onPageScore >= 50 ? "var(--warning)" : "var(--destructive)"
                    return (
                      <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "10px", color: "var(--foreground-3)", width: "14px", flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--foreground-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.url.replace(/^https?:\/\//, "")}
                          </div>
                          <div style={{ height: "3px", background: "oklch(0.20 0.006 230)", borderRadius: "2px", marginTop: "3px" }}>
                            <div style={{ height: "100%", width: `${barPct}%`, background: "var(--destructive)", borderRadius: "2px" }} />
                          </div>
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", flexShrink: 0, fontFamily: "var(--font-mono)" }}>{p.issueTypes.length} issues</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: scoreColor, flexShrink: 0, fontFamily: "var(--font-mono)" }}>{p.onPageScore}/100</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Top scoring pages leaderboard */}
          {pageAnalyses.length >= 5 && (() => {
            const top5 = [...pageAnalyses].filter(p => !p.isNoindex).sort((a, b) => b.onPageScore - a.onPageScore).slice(0, 5)
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid oklch(0.68 0.16 155 / 0.2)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginTop: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  ✦ Top 5 pages by SEO score
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {top5.map((p, i) => (
                    <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "10px", color: "var(--foreground-3)", width: "14px", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--foreground-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: p.onPageScore >= 90 ? "var(--success)" : p.onPageScore >= 70 ? "var(--primary-2)" : "var(--warning)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{p.onPageScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Internal link hubs */}
          {pageAnalyses.length >= 5 && (() => {
            const hubs = pageAnalyses.filter(p => p.internalLinkCount >= 10 && !p.isNoindex).sort((a, b) => b.internalLinkCount - a.internalLinkCount).slice(0, 3)
            if (hubs.length === 0) return null
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid oklch(0.55 0.13 178 / 0.2)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginTop: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  ⟶ Internal link hubs (pages distributing the most link equity)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {hubs.map(p => (
                    <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-2)", fontFamily: "var(--font-mono)", width: "50px", flexShrink: 0 }}>{p.internalLinkCount}↗</span>
                      <span style={{ fontSize: "11px", color: "var(--foreground-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                      <span style={{ fontSize: "10px", color: "var(--foreground-3)", flexShrink: 0 }}>{p.incomingInternalLinks} links in</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Missing meta descriptions bulk list */}
          {(() => {
            const noMeta = pageAnalyses.filter(p => !p.metaDescription)
            if (noMeta.length === 0) return null
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid oklch(0.80 0.15 75 / 0.25)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginTop: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    ⚠ {noMeta.length} page{noMeta.length !== 1 ? "s" : ""} missing meta description
                  </div>
                  <a href={`/api/v1/audits/${id}/issues/csv`} download style={{ fontSize: "10px", color: "var(--primary-2)", textDecoration: "none" }}>Export CSV →</a>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "180px", overflowY: "auto" }}>
                  {noMeta.slice(0, 25).map(p => (
                    <div key={p.url} style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--foreground-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.url}
                    </div>
                  ))}
                  {noMeta.length > 25 && <div style={{ fontSize: "10px", color: "var(--foreground-3)" }}>+{noMeta.length - 25} more (export CSV for full list)</div>}
                </div>
              </div>
            )
          })()}

          {/* Indexability report */}
          {pageAnalyses.length > 0 && (() => {
            const indexable = pageAnalyses.filter(p => !p.isNoindex)
            const noindexCount = pageAnalyses.length - indexable.length
            const indexPct = Math.round(indexable.length / pageAnalyses.length * 100)
            const withCanon = indexable.filter(p => p.hasCanonical).length
            const withSchema = indexable.filter(p => p.hasJsonLd).length
            return (
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginTop: "16px", marginBottom: "8px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Indexability report
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                  {[
                    { label: "Indexable", value: `${indexPct}%`, sub: `${indexable.length} pages`, color: indexPct > 80 ? "var(--success)" : "var(--warning)" },
                    { label: "Noindex", value: noindexCount.toString(), sub: `${100 - indexPct}% blocked`, color: noindexCount > 0 ? "var(--warning)" : "var(--success)" },
                    { label: "Canonical", value: `${Math.round(withCanon / indexable.length * 100)}%`, sub: `${withCanon} pages`, color: withCanon === indexable.length ? "var(--success)" : "var(--warning)" },
                    { label: "Schema", value: `${Math.round(withSchema / indexable.length * 100)}%`, sub: `${withSchema} pages`, color: withSchema > indexable.length * 0.5 ? "var(--success)" : "var(--foreground-3)" },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "18px", fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>{value}</div>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                      <div style={{ fontSize: "9px", color: "var(--foreground-3)" }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Revenue at risk from orphan pages */}
          {pageAnalyses.length > 5 && (() => {
            const orphans = pageAnalyses.filter(p => !p.isNoindex && p.incomingInternalLinks === 0 && p.wordCount > 200)
            if (orphans.length < 2) return null
            const orphanPct = Math.round(orphans.length / pageAnalyses.length * 100)
            return (
              <div style={{ background: "oklch(0.14 0.05 27 / 0.3)", border: "1px solid oklch(0.65 0.20 27 / 0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--destructive)", marginBottom: "4px" }}>
                  {orphans.length} orphan pages ({orphanPct}% of content) not receiving internal link equity
                </div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)", lineHeight: 1.5 }}>
                  Pages with no internal links receive zero authority from your site. Add internal links to these pages to boost their rankings. Orphans are among the highest-ROI fixes.
                </div>
              </div>
            )
          })()}

          {/* H1 missing on high-authority pages */}
          {pageAnalyses.length > 3 && (() => {
            const highAuthNoH1 = pageAnalyses.filter(p => (p.incomingInternalLinks ?? 0) >= 3 && (!p.h1Text || p.h1Count === 0) && !p.isNoindex)
            if (highAuthNoH1.length === 0) return null
            return (
              <div style={{ background: "oklch(0.14 0.05 27 / 0.25)", border: "1px solid oklch(0.65 0.20 27 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  ⚠ {highAuthNoH1.length} high-authority page{highAuthNoH1.length !== 1 ? "s" : ""} missing H1 (has 3+ links in)
                </div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>
                  These pages receive the most internal link equity but lack an H1 tag. Fixing these has high SEO impact.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "8px" }}>
                  {highAuthNoH1.slice(0, 3).map(p => (
                    <div key={p.url} style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--primary-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.url.replace(/^https?:\/\/[^/]+/, "") || "/"} — {p.incomingInternalLinks} links in
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Underperforming over-structured pages */}
          {pageAnalyses.length > 5 && (() => {
            const overStructured = pageAnalyses.filter(p => !p.isNoindex && p.h2Count >= 5 && p.onPageScore < 60)
            if (overStructured.length < 2) return null
            return (
              <div style={{ background: "oklch(0.14 0.04 70 / 0.25)", border: "1px solid oklch(0.80 0.15 75 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  ✎ Well-structured but underperforming ({overStructured.length} pages with 5+ H2s, score &lt;60)
                </div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginBottom: "8px" }}>
                  These pages have good structure but poor SEO. Common issues: missing meta, thin content, or no schema.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {overStructured.slice(0, 4).map(p => (
                    <div key={p.url} style={{ fontSize: "10px", color: "var(--foreground-2)", fontFamily: "var(--font-mono)", display: "flex", gap: "8px" }}>
                      <span style={{ color: "var(--warning)" }}>{p.onPageScore}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                      <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{p.h2Count} H2s</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Content expansion opportunities */}
          {pageAnalyses.length > 3 && (() => {
            const expandable = [...pageAnalyses]
              .filter(p => !p.isNoindex && p.wordCount >= 300 && p.wordCount < 600)
              .sort((a, b) => (b.incomingInternalLinks - a.incomingInternalLinks) || (a.onPageScore - b.onPageScore))
              .slice(0, 5)
            if (expandable.length === 0) return null
            return (
              <div style={{ background: "oklch(0.14 0.04 196 / 0.25)", border: "1px solid oklch(0.55 0.13 178 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  ✎ Content expansion opportunities ({expandable.length} pages with 300–600 words)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {expandable.map(p => (
                    <div key={p.url} style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "11px" }}>
                      <span style={{ color: "var(--foreground-3)", fontFamily: "var(--font-mono)", width: "50px", flexShrink: 0 }}>{p.wordCount}w</span>
                      <span style={{ color: "var(--foreground-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>{p.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                      <span style={{ color: "var(--foreground-3)", fontSize: "10px", flexShrink: 0 }}>{p.incomingInternalLinks} links in</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Duplicate title tags */}
          {pageAnalyses.length > 3 && (() => {
            const titleMap = new Map<string, string[]>()
            for (const p of pageAnalyses) {
              if (!p.title) continue
              const norm = p.title.trim().toLowerCase()
              if (!titleMap.has(norm)) titleMap.set(norm, [])
              titleMap.get(norm)!.push(p.url)
            }
            const dupes = [...titleMap.entries()].filter(([, urls]) => urls.length > 1)
            if (dupes.length === 0) return null
            return (
              <div style={{ background: "oklch(0.14 0.05 27 / 0.25)", border: "1px solid oklch(0.65 0.20 27 / 0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  ⚠ Duplicate title tags ({dupes.length} groups)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dupes.slice(0, 3).map(([title, urls]) => (
                    <div key={title} style={{ fontSize: "10px", color: "var(--foreground-3)" }}>
                      <div style={{ color: "var(--foreground-2)", marginBottom: "2px", fontWeight: 600 }}>{title.slice(0, 70)}{title.length > 70 ? "…" : ""}</div>
                      <div style={{ fontFamily: "var(--font-mono)" }}>{urls.slice(0, 2).join(", ")}{urls.length > 2 ? ` +${urls.length - 2} more` : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Duplicate meta descriptions */}
          {pageAnalyses.length > 3 && (() => {
            const metaMap = new Map<string, string[]>()
            for (const p of pageAnalyses) {
              if (!p.metaDescription) continue
              const norm = p.metaDescription.trim().toLowerCase()
              if (!metaMap.has(norm)) metaMap.set(norm, [])
              metaMap.get(norm)!.push(p.url)
            }
            const dupes = [...metaMap.entries()].filter(([, urls]) => urls.length > 1)
            if (dupes.length === 0) return null
            return (
              <div style={{ background: "oklch(0.14 0.04 70 / 0.25)", border: "1px solid oklch(0.80 0.15 75 / 0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  ⚠ Duplicate meta descriptions ({dupes.length} groups, {dupes.reduce((s, [,u]) => s + u.length, 0)} pages)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dupes.slice(0, 3).map(([meta, urls]) => (
                    <div key={meta} style={{ fontSize: "10px", color: "var(--foreground-3)" }}>
                      <div style={{ color: "var(--foreground-2)", marginBottom: "2px", fontStyle: "italic" }}>&ldquo;{meta.slice(0, 80)}{meta.length > 80 ? "…" : ""}&rdquo;</div>
                      <div style={{ fontFamily: "var(--font-mono)", color: "var(--foreground-3)" }}>{urls.slice(0, 2).join(", ")}{urls.length > 2 ? ` +${urls.length - 2} more` : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Duplicate URL detection */}
          {pageAnalyses.length > 3 && (() => {
            const normalizeUrl = (u: string) => u.toLowerCase().replace(/\/$/, "").replace(/^https?:\/\/www\./, "https://")
            const seen = new Map<string, string[]>()
            for (const p of pageAnalyses) {
              const norm = normalizeUrl(p.url)
              if (!seen.has(norm)) seen.set(norm, [])
              seen.get(norm)!.push(p.url)
            }
            const dupes = [...seen.entries()].filter(([, urls]) => urls.length > 1)
            if (dupes.length === 0) return null
            return (
              <div style={{ background: "oklch(0.14 0.05 27 / 0.3)", border: "1px solid oklch(0.65 0.20 27 / 0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  ⚠ Duplicate URL variants detected ({dupes.length} groups)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dupes.slice(0, 3).map(([norm, urls]) => (
                    <div key={norm} style={{ fontSize: "10px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>
                      {urls.join(" ↔ ")}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Crawl budget waste alert */}
          {pageAnalyses.length > 0 && (() => {
            const noindexCount = pageAnalyses.filter(p => p.isNoindex).length
            const noindexPct = Math.round(noindexCount / pageAnalyses.length * 100)
            if (noindexPct < 20 || noindexCount < 5) return null
            return (
              <div style={{
                background: "oklch(0.14 0.05 70 / 0.5)", border: "1px solid oklch(0.80 0.15 75 / 0.3)",
                borderRadius: "var(--radius-xl)", padding: "14px 18px", marginTop: "16px",
                display: "flex", alignItems: "flex-start", gap: "10px",
              }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--warning)", marginBottom: "2px" }}>
                    Crawl budget waste: {noindexPct}% of pages are noindex ({noindexCount} pages)
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--foreground-3)", lineHeight: 1.5 }}>
                    Search engines waste crawl budget on pages that won't be indexed. Audit your noindex directives — remove them from pages that should rank, or use <code>robots.txt</code> to block irrelevant pages entirely.
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Page issue lists: noindex, thin, duplicate H1, orphans */}
          {pageAnalyses.length > 0 && (() => {
            const noindex = pageAnalyses.filter(p => p.isNoindex)
            const thin = pageAnalyses.filter(p => !p.isNoindex && p.wordCount > 0 && p.wordCount < 300)
            const noH1 = pageAnalyses.filter(p => !p.isNoindex && p.h1Count === 0)
            const multiH1 = pageAnalyses.filter(p => p.h1Count > 1)
            const noCanonical = pageAnalyses.filter(p => !p.isNoindex && !p.hasCanonical)
            const noSchema = pageAnalyses.filter(p => !p.isNoindex && !p.hasJsonLd)
            const orphans = pageAnalyses.filter(p => !p.isNoindex && p.incomingInternalLinks === 0)
            const imgAltIssues = pageAnalyses.filter(p => (p.imagesMissingAlt ?? 0) > 0)
            const noH2 = pageAnalyses.filter(p => !p.isNoindex && p.h2Count === 0)
            const longPages = pageAnalyses.filter(p => !p.isNoindex && p.wordCount >= 4000)
            const noImages = pageAnalyses.filter(p => !p.isNoindex && p.imageCount === 0 && p.wordCount > 300)
            const noOutLinks = pageAnalyses.filter(p => !p.isNoindex && p.internalLinkCount === 0 && p.wordCount > 200)
            const longUrls = pageAnalyses.filter(p => { try { return new URL(p.url).pathname.length > 80 } catch { return false } })
            const sections = [
              { title: "Noindex pages", items: noindex, color: "var(--warning)", icon: "⊗" },
              { title: "Thin content (<300w)", items: thin, color: "var(--destructive)", icon: "≡" },
              { title: "No H1 tag", items: noH1, color: "var(--destructive)", icon: "H1" },
              { title: "Multiple H1 tags", items: multiH1, color: "var(--warning)", icon: "H1+" },
              { title: "No canonical tag", items: noCanonical, color: "var(--warning)", icon: "⊕" },
              { title: "No schema markup", items: noSchema, color: "var(--foreground-3)", icon: "{ }" },
              { title: "Orphan pages", items: orphans, color: "var(--foreground-3)", icon: "⊘" },
              { title: "Images missing alt", items: imgAltIssues, color: "var(--warning)", icon: "img" },
              { title: "No H2 subheadings", items: noH2, color: "var(--warning)", icon: "H2" },
              { title: "Long pages (4000w+)", items: longPages, color: "var(--foreground-3)", icon: "≡≡" },
              { title: "No images (text-only)", items: noImages, color: "var(--foreground-3)", icon: "img0" },
              { title: "No outgoing links", items: noOutLinks, color: "var(--warning)", icon: "↗0" },
              { title: "Long URLs (80+ chars)", items: longUrls, color: "var(--foreground-3)", icon: "/…/" },
            ].filter(s => s.items.length > 0)
            if (sections.length === 0) return null
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginTop: "20px" }}>
                {sections.map(sec => (
                  <div key={sec.title} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "10px", color: sec.color }}>{sec.icon}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: sec.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{sec.title}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--foreground-3)", marginLeft: "auto" }}>{sec.items.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "120px", overflowY: "auto" }}>
                      {sec.items.slice(0, 20).map(p => (
                        <div key={p.url} style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--foreground-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.url.replace(/^https?:\/\//, "")}
                        </div>
                      ))}
                      {sec.items.length > 20 && <div style={{ fontSize: "9px", color: "var(--foreground-3)" }}>+{sec.items.length - 20} more</div>}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Score projection after fixing top 5 issues */}
          {audit.healthScore != null && issues.filter(i => !i.isFixed).length >= 3 && (() => {
            const openIssues = issues.filter(i => !i.isFixed)
            const critCount = Math.min(openIssues.filter(i => i.severity === "critical").length, 5)
            const warnCount = Math.min(openIssues.filter(i => i.severity === "warning").length, 5)
            const projectedGain = critCount * 4 + warnCount * 2
            const projectedScore = Math.min(100, audit.healthScore + projectedGain)
            if (projectedScore <= audit.healthScore) return null
            return (
              <div style={{ background: "oklch(0.14 0.04 196 / 0.3)", border: "1px solid oklch(0.55 0.13 178 / 0.3)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary-2)", marginBottom: "2px" }}>
                    Estimated score after fixing top issues
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>
                    Fixing {critCount} critical + {warnCount} warnings could gain ~{projectedGain} points
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>Now</div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{audit.healthScore}</div>
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--success)" }}>→</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>Projected</div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--success)", fontFamily: "var(--font-mono)" }}>{projectedScore}</div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* What to fix this week — top 5 priority issues */}
          {issues.filter(i => !i.isFixed).length > 0 && (() => {
            function fixMins(type: string): number {
              const map: Record<string, number> = {
                missing_title_tag: 5, missing_h1: 5, missing_meta_description: 5,
                title_too_long: 2, title_too_short: 2, meta_description_too_long: 2,
                multiple_h1_tags: 10, no_canonical_tag: 15, noindex_page: 15,
                robots_noindex: 30, duplicate_title: 30, broken_internal_link: 30,
                no_heading_hierarchy: 30, images_missing_alt: 60, poor_internal_linking: 60,
                thin_content: 120, missing_schema_markup: 120, no_schema_markup: 120,
                redirect_chain: 60, orphan_page: 60, orphaned_page: 60,
              }
              return map[type] ?? 999
            }
            const sevRank = (s: string) => s === "critical" ? 3 : s === "warning" ? 2 : 1
            const top5 = [...issues]
              .filter(i => !i.isFixed)
              .sort((a, b) => {
                const sevDiff = sevRank(b.severity) - sevRank(a.severity)
                if (sevDiff !== 0) return sevDiff
                return fixMins(a.type) - fixMins(b.type)
              })
              .slice(0, 5)
            return (
              <div style={{ background: "oklch(0.14 0.04 178 / 0.25)", border: "1px solid oklch(0.55 0.13 178 / 0.25)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "24px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  ✦ What to fix this week
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {top5.map((issue, idx) => (
                    <div key={issue.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground-3)", fontFamily: "var(--font-mono)", width: "16px", flexShrink: 0 }}>{idx + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground)" }}>{issue.title}</span>
                        <span style={{ fontSize: "10px", color: issue.severity === "critical" ? "var(--destructive)" : "var(--warning)", marginLeft: "8px" }}>{issue.severity}</span>
                        {fixMins(issue.type) < 999 && <span style={{ fontSize: "10px", color: "var(--foreground-3)", marginLeft: "6px" }}>~{fixMins(issue.type) < 60 ? `${fixMins(issue.type)} min` : `${fixMins(issue.type) / 60}h`}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Opportunity pages panel */}
          {opportunityPages.length > 0 && (
            <div style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", border: "1px solid oklch(0.55 0.13 178 / 0.25)", borderRadius: "var(--radius-xl)", padding: "18px 22px", marginTop: "24px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                ✦ Pages with highest SEO opportunity
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {opportunityPages.map(p => (
                  <div key={p.url} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: "12px", color: "var(--foreground)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.url}</div>
                      <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginTop: "1px" }}>
                        {p.incomingInternalLinks} internal links · {p.wordCount} words
                      </div>
                    </div>
                    <span style={{
                      fontSize: "13px", fontWeight: 800, fontFamily: "var(--font-mono)",
                      color: p.onPageScore >= 60 ? "var(--warning)" : "var(--destructive)", flexShrink: 0,
                    }}>{p.onPageScore}/100</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", flexShrink: 0 }}>
                      +{Math.round(80 - p.onPageScore)}pts potential
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    queued:   { bg: "oklch(0.18 0.06 230)", text: "oklch(0.70 0.12 230)" },
    running:  { bg: "oklch(0.18 0.06 75)",  text: "oklch(0.80 0.15 75)"  },
    complete: { bg: "oklch(0.14 0.07 155)", text: "oklch(0.68 0.16 155)" },
    failed:   { bg: "oklch(0.14 0.07 27)",  text: "oklch(0.65 0.20 27)"  },
  }
  const c = colors[status] ?? { bg: "oklch(0.18 0.06 230)", text: "oklch(0.70 0.12 230)" }
  return (
    <span style={{ padding: "3px 8px", background: c.bg, color: c.text, borderRadius: "4px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {status}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 54, cx = 70, cy = 70
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? "oklch(0.68 0.16 155)" : score >= 50 ? "oklch(0.80 0.15 75)" : "oklch(0.65 0.20 27)"

  return (
    <div style={{ background: "oklch(0.12 0.008 230 / 0.60)", border: "1px solid oklch(0.98 0 0 / 0.06)", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(0.22 0.006 230)" strokeWidth="10" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, fill: color }}>
          {score}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "var(--font-sans)", fontSize: "10px", fill: "oklch(0.38 0.008 230)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Health
        </text>
      </svg>
    </div>
  )
}

function StatCard({ label, value, color, suffix = "", sub, subColor }: { label: string; value: number | string; color: string; suffix?: string; sub?: string; subColor?: string }) {
  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: "24px", fontWeight: 800, color, fontFamily: "var(--font-mono)", letterSpacing: "-0.5px", filter: `drop-shadow(0 0 6px ${color}80)` }}>
        {value}{suffix}
      </div>
      {sub && <div style={{ fontSize: "10px", color: subColor ?? "var(--foreground-3)", fontWeight: 600, marginTop: "1px", fontFamily: "var(--font-mono)" }}>{sub}</div>}
      <div style={{ fontSize: "10px", color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "3px" }}>
        {label}
      </div>
    </div>
  )
}

function RunningState({ status }: { status: string }) {
  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "64px 40px", textAlign: "center",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "14px",
        background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", boxShadow: "0 0 24px var(--primary-glow)", fontSize: "24px",
      }}>
        {status === "queued" ? "⏳" : "◎"}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px", letterSpacing: "-0.3px" }}>
        {status === "queued" ? "Audit queued — starting soon" : "Crawling your site…"}
      </div>
      <div style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.7 }}>
        This usually takes 2–5 minutes. This page will update automatically when ready.
      </div>
      {/* Animated dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "20px" }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "var(--primary)",
            display: "inline-block",
            animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function CategoryBreakdown({ issues, auditId }: { issues: AuditIssue[]; auditId: string }) {
  const cats = new Map<string, { total: number; critical: number }>()
  for (const i of issues) {
    const entry = cats.get(i.category) ?? { total: 0, critical: 0 }
    cats.set(i.category, { total: entry.total + 1, critical: entry.critical + (i.severity === "critical" ? 1 : 0) })
  }
  const sorted = [...cats.entries()].sort((a, b) => b[1].total - a[1].total)
  const maxCount = sorted[0]?.[1].total ?? 1

  const LABELS: Record<string, string> = {
    technical: "Technical", on_page: "On-Page", off_page: "Off-Page",
    local: "Local SEO", ecommerce: "eCommerce", content: "Content",
  }

  return (
    <div style={{
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "24px",
    }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
        By Category
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sorted.map(([cat, { total, critical }]) => {
          const pct = (total / maxCount) * 100
          return (
            <Link key={cat} href={`/audits/${auditId}?cat=${cat}`} style={{ display: "block", textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground-2)", width: "80px", flexShrink: 0 }}>{LABELS[cat] ?? cat}</span>
                <div style={{ flex: 1, height: "6px", background: "oklch(0.20 0.006 230)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: critical > 0 ? "linear-gradient(90deg, var(--destructive), var(--warning))" : "var(--primary)", borderRadius: "3px", transition: "width 0.5s ease-out" }} />
                </div>
                <span style={{ fontSize: "11px", color: "var(--foreground-3)", width: "20px", textAlign: "right" }}>{total}</span>
                {critical > 0 && <span style={{ fontSize: "10px", color: "var(--destructive)", fontWeight: 700 }}>!{critical}</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const FIX_TIME_MAP: Record<string, string> = {
  missing_title_tag: "5 min", missing_h1: "5 min", missing_meta_description: "5 min",
  title_too_long: "2 min", title_too_short: "2 min", meta_description_too_long: "2 min",
  multiple_h1_tags: "10 min", no_canonical_tag: "15 min", duplicate_title: "30 min",
  duplicate_meta_description: "30 min", broken_internal_link: "30 min",
  thin_content: "2 h", poor_internal_linking: "1 h", no_heading_hierarchy: "30 min",
  images_missing_alt: "1 h", missing_schema_markup: "2 h", no_schema_markup: "2 h",
  redirect_chain: "1 h", robots_noindex: "30 min", noindex_page: "15 min",
  orphan_page: "1 h", orphaned_page: "1 h", mixed_content_links: "30 min",
}

function IssuesSection({ issues, auditId, sevFilter, catFilter, statusFilter, sortBy, totalPages }: { issues: AuditIssue[]; auditId: string; sevFilter: string | null; catFilter: string | null; statusFilter: string | null; sortBy?: string | null; totalPages?: number }) {
  if (issues.length === 0) return null

  const openCount = issues.filter(i => !i.isFixed).length
  const fixedCount = issues.filter(i => i.isFixed).length

  if (openCount === 0 && fixedCount > 0) {
    return (
      <section style={{ marginBottom: "36px" }}>
        <div style={{
          background: "linear-gradient(135deg, oklch(0.16 0.05 155 / 0.4), oklch(0.14 0.04 178 / 0.3))",
          border: "1px solid oklch(0.60 0.16 155 / 0.4)", borderRadius: "var(--radius-xl)",
          padding: "40px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--success)", letterSpacing: "-0.3px", marginBottom: "6px" }}>
            All issues resolved!
          </div>
          <div style={{ fontSize: "13px", color: "var(--foreground-3)", lineHeight: 1.6 }}>
            You've fixed all {fixedCount} issue{fixedCount !== 1 ? "s" : ""} in this audit. Great work!
          </div>
        </div>
      </section>
    )
  }

  const QUICK_WIN_TYPES = new Set(["missing_title_tag","missing_h1","missing_meta_description","title_too_long","title_too_short","meta_description_too_long","no_canonical_tag","noindex_page","robots_noindex"])

  // Celebrate fixed issues when some (not all) are fixed
  const recentlyFixed = issues.filter(i => i.isFixed).sort((a, b) => {
    if (!a.fixedAt && !b.fixedAt) return 0
    return new Date(b.fixedAt ?? 0).getTime() - new Date(a.fixedAt ?? 0).getTime()
  }).slice(0, 3)

  const filtered = issues.filter(i =>
    (!sevFilter || i.severity === sevFilter) &&
    (!catFilter || i.category === catFilter) &&
    (statusFilter === "open" ? !i.isFixed : statusFilter === "fixed" ? i.isFixed : statusFilter === "quick" ? !i.isFixed && QUICK_WIN_TYPES.has(i.type) : true)
  )

  // Apply sorting
  if (sortBy === "effort") {
    const effortMin: Record<string, number> = {
      missing_title_tag: 5, missing_h1: 5, missing_meta_description: 5,
      title_too_long: 2, title_too_short: 2, meta_description_too_long: 2,
      multiple_h1_tags: 10, no_canonical_tag: 15, noindex_page: 15,
      robots_noindex: 30, duplicate_title: 30, broken_internal_link: 30,
      no_heading_hierarchy: 30, images_missing_alt: 60, poor_internal_linking: 60,
      thin_content: 120, missing_schema_markup: 120, no_schema_markup: 120, orphan_page: 60,
    }
    filtered.sort((a, b) => (effortMin[a.type] ?? 999) - (effortMin[b.type] ?? 999))
  }

  const critical = filtered.filter(i => i.severity === "critical")
  const warnings = filtered.filter(i => i.severity === "warning")
  const info = filtered.filter(i => i.severity === "info")
  const rest = filtered.filter(i => !["critical", "warning", "info"].includes(i.severity))

  const groups = [
    { label: "Critical", color: "var(--destructive)", bg: "var(--destructive-bg)", border: "oklch(0.65 0.20 27 / 0.3)", items: critical },
    { label: "Warning", color: "var(--warning)", bg: "var(--warning-bg)", border: "oklch(0.80 0.15 75 / 0.3)", items: warnings },
    { label: "Info", color: "var(--info)", bg: "var(--info-bg)", border: "oklch(0.70 0.12 230 / 0.3)", items: info },
    { label: "Other", color: "var(--foreground-3)", bg: "oklch(0.18 0.008 230)", border: "var(--glass-border)", items: rest },
  ].filter(g => g.items.length > 0)

  const severities = ["critical", "warning", "info"]
  const categories = [...new Set(issues.map(i => i.category))]

  const openIssues = issues.filter(i => !i.isFixed)
  const critOpen = openIssues.filter(i => i.severity === "critical").length
  const warnOpen = openIssues.filter(i => i.severity === "warning").length
  const infoOpen = openIssues.filter(i => i.severity === "info").length
  const totalOpen = openIssues.length
  const pctCrit = totalOpen > 0 ? (critOpen / totalOpen) * 100 : 0
  const pctWarn = totalOpen > 0 ? (warnOpen / totalOpen) * 100 : 0
  const pctInfo = totalOpen > 0 ? (infoOpen / totalOpen) * 100 : 0

  return (
    <section style={{ marginBottom: "36px" }}>
      {totalOpen > 0 && (
        <div style={{ marginBottom: "12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            {[
              { label: "Critical", count: critOpen, color: "var(--destructive)" },
              { label: "Warning", count: warnOpen, color: "var(--warning)" },
              { label: "Info", count: infoOpen, color: "var(--info)" },
            ].filter(s => s.count > 0).map(s => (
              <span key={s.label} style={{ fontSize: "11px", color: s.color, fontWeight: 700 }}>
                {s.count} {s.label}
              </span>
            ))}
            <span style={{ fontSize: "10px", color: "var(--foreground-3)", marginLeft: "auto" }}>{fixedCount} fixed</span>
          </div>
          <div style={{ height: "4px", borderRadius: "2px", background: "oklch(0.25 0.008 230)", display: "flex", overflow: "hidden", gap: "1px" }}>
            {pctCrit > 0 && <div style={{ width: `${pctCrit}%`, background: "var(--destructive)", borderRadius: "2px 0 0 2px" }} />}
            {pctWarn > 0 && <div style={{ width: `${pctWarn}%`, background: "var(--warning)" }} />}
            {pctInfo > 0 && <div style={{ width: `${pctInfo}%`, background: "var(--info)", borderRadius: "0 2px 2px 0" }} />}
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Issues Found
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{filtered.length} of {issues.length}</span>
          <CopyIssuesButton auditId={auditId} />
          <BulkFixButton auditId={auditId} totalCount={issues.length} fixedCount={issues.filter(i => i.isFixed).length} />
        </div>
      </div>
      {/* Fixed issues celebration banner */}
      {!statusFilter && recentlyFixed.length > 0 && fixedCount < issues.length && (
        <div style={{ background: "oklch(0.14 0.05 155 / 0.2)", border: "1px solid oklch(0.68 0.16 155 / 0.25)", borderRadius: "var(--radius-lg)", padding: "10px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
          <span style={{ fontSize: "16px", flexShrink: 0 }}>✓</span>
          <span style={{ color: "var(--success)", fontWeight: 700 }}>{fixedCount} issue{fixedCount !== 1 ? "s" : ""} fixed</span>
          <span style={{ color: "var(--foreground-3)" }}>— {recentlyFixed.map(i => i.title).join(", ")}{recentlyFixed.length < fixedCount ? ` +${fixedCount - recentlyFixed.length} more` : ""}</span>
        </div>
      )}

      {/* Quick wins callout — show when not already filtered */}
      {!statusFilter && !sevFilter && !catFilter && (() => {
        const quickWins = issues.filter(i => !i.isFixed && QUICK_WIN_TYPES.has(i.type))
        if (quickWins.length === 0) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 196 / 0.3)", border: "1px solid oklch(0.55 0.13 178 / 0.3)", borderRadius: "var(--radius-md)", padding: "8px 14px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px" }}>⚡</span>
            <span style={{ fontSize: "12px", color: "var(--primary-2)", flex: 1 }}>
              <strong>{quickWins.length}</strong> quick win{quickWins.length !== 1 ? "s" : ""} — metadata fixes you can resolve in minutes
            </span>
            <Link href={`/audits/${auditId}?status=quick` as any} style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textDecoration: "none", padding: "3px 10px", border: "1px solid oklch(0.55 0.13 178 / 0.4)", borderRadius: "6px", background: "var(--primary-soft)" }}>
              View →
            </Link>
          </div>
        )
      })()}
      {/* Status tabs: Open / Fixed / All */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "12px", background: "oklch(0.12 0.008 230 / 0.5)", borderRadius: "8px", padding: "3px", width: "fit-content" }}>
        {[
          { label: `All (${issues.length})`, value: null },
          { label: `Open (${openCount})`, value: "open" },
          { label: `Fixed (${fixedCount})`, value: "fixed" },
          { label: `⚡ Quick wins`, value: "quick" },
        ].map(({ label, value }) => {
          const isActive = statusFilter === value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const href = (value ? `/audits/${auditId}?status=${value}${catFilter ? `&cat=${catFilter}` : ""}${sevFilter ? `&sev=${sevFilter}` : ""}` : `/audits/${auditId}`) as any
          return (
            <Link key={label} href={href} style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
              textDecoration: "none",
              background: isActive ? "var(--glass-bg)" : "transparent",
              color: isActive ? "var(--foreground)" : "var(--foreground-3)",
              border: isActive ? "1px solid var(--glass-border)" : "1px solid transparent",
            }}>{label}</Link>
          )
        })}
      </div>
      {/* Severity/category filter pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={(statusFilter ? `/audits/${auditId}?status=${statusFilter}` : `/audits/${auditId}`) as any} style={{
          padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
          textDecoration: "none",
          background: !sevFilter && !catFilter ? "var(--primary-soft)" : "transparent",
          color: !sevFilter && !catFilter ? "var(--primary-2)" : "var(--foreground-3)",
          border: !sevFilter && !catFilter ? "1px solid oklch(0.55 0.13 178 / 0.3)" : "1px solid var(--glass-border)",
        }}>All</Link>
        {severities.filter(s => issues.some(i => i.severity === s)).map(s => {
          const params = new URLSearchParams()
          params.set("sev", s)
          if (statusFilter) params.set("status", statusFilter)
          return (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link key={s} href={`/audits/${auditId}?${params}` as any} style={{
              padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
              textDecoration: "none", textTransform: "capitalize",
              background: sevFilter === s ? "var(--primary-soft)" : "transparent",
              color: sevFilter === s ? "var(--primary-2)" : "var(--foreground-3)",
              border: sevFilter === s ? "1px solid oklch(0.55 0.13 178 / 0.3)" : "1px solid var(--glass-border)",
            }}>{s}</Link>
          )
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {groups.map(group => group.items.map((issue) => (
          <ExpandableIssue
            key={issue.id}
            issueId={issue.id}
            auditId={auditId}
            title={issue.title}
            description={issue.description}
            severity={issue.severity}
            category={issue.category}
            affectedCount={issue.affectedCount}
            affectedUrls={(issue.affectedUrls as string[] | null) ?? undefined}
            fixInstructions={issue.fixInstructions}
            isFixed={issue.isFixed}
            fixTimeLabel={FIX_TIME_MAP[issue.type]}
            totalPages={totalPages}
            scoreImpact={
              issue.severity === "critical"
                ? Math.min(10 * Math.min(issue.affectedCount, 5), 50)
                : issue.severity === "warning"
                  ? Math.min(4 * Math.min(issue.affectedCount, 5), 20)
                  : Math.min(issue.affectedCount, 5)
            }
          />
        )))}
      </div>
    </section>
  )
}

function PagesSection({ pages, auditId }: { pages: PageAnalysis[]; auditId: string }) {
  return (
    <section>
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.3px", marginBottom: "16px" }}>
        Per-page on-page scores
        <span style={{ fontSize: "12px", fontWeight: 400, color: "oklch(0.38 0.008 230)", marginLeft: "8px" }}>lowest first</span>
      </h2>
      <div style={{ background: "oklch(0.12 0.008 230 / 0.60)", border: "1px solid oklch(0.98 0 0 / 0.06)", borderRadius: "10px", overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px 50px 80px", padding: "10px 20px", borderBottom: "1px solid oklch(0.22 0.006 230)" }}>
          {["Score", "URL", "Words", "H1", "H2", "Depth", "Issues"].map((h) => (
            <div key={h} style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.38 0.008 230)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>
        {pages.map((page, i) => {
          const scoreColor = page.onPageScore >= 80 ? "oklch(0.68 0.16 155)" : page.onPageScore >= 50 ? "oklch(0.80 0.15 75)" : "oklch(0.65 0.20 27)"
          const needsTitle = !page.title || page.titleLength < 10 || page.titleLength > 65
          // Score breakdown indicators
          const h1MatchesTitle = !!page.h1Text && !!page.title && page.h1Text.toLowerCase().trim() === page.title.toLowerCase().trim()
          const checks = [
            { label: "Title", ok: !!page.title && page.titleLength >= 20 && page.titleLength <= 60 },
            { label: "Meta", ok: !!page.metaDescription && page.metaDescriptionLength <= 160 },
            { label: "H1", ok: page.h1Count === 1 },
            ...(page.h1Count === 1 && page.title ? [{ label: "H1≠Title", ok: !h1MatchesTitle }] : []),
            { label: "Words", ok: page.wordCount >= 300 },
            { label: "H2s", ok: page.h2Count > 0 },
            { label: "Canon", ok: page.hasCanonical },
            { label: "Schema", ok: page.hasJsonLd },
            ...(page.imageCount > 0 ? [{ label: `Alt (${page.imagesMissingAlt}/${page.imageCount})`, ok: page.imagesMissingAlt === 0 }] : []),
          ]
          return (
            <div
              key={page.url}
              style={{
                padding: "12px 20px",
                borderBottom: i < pages.length - 1 ? "1px solid oklch(0.22 0.006 230)" : "none",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px 50px 80px", alignItems: "center" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: scoreColor, fontFamily: "var(--font-mono)" }}>
                  {page.onPageScore}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", paddingRight: "16px" }}>
                  <span style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", flex: 1, minWidth: 0 }}>
                    {page.url.replace(/^https?:\/\//, "")}
                  </span>
                  <a href={`https://www.google.com/search?q=site:${encodeURIComponent(page.url)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: "var(--primary-2)", textDecoration: "none", flexShrink: 0, opacity: 0.7 }} title="Search on Google">G↗</a>
                  <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: "var(--foreground-3)", textDecoration: "none", flexShrink: 0 }} title="Open page">↗</a>
                </div>
                <div style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)" }}>{page.wordCount}</div>
                <div style={{ fontSize: "12px", color: page.h1Count === 1 ? "oklch(0.68 0.16 155)" : "oklch(0.65 0.20 27)" }}>{page.h1Count}</div>
                <div style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)" }}>{page.h2Count}</div>
                <div style={{ fontSize: "11px", color: "oklch(0.55 0.008 230)", fontFamily: "var(--font-mono)" }} title="URL depth (segments)">{(() => { try { return new URL(page.url).pathname.split("/").filter(Boolean).length } catch { return "?" } })()}</div>
                <div style={{ fontSize: "11px", color: "oklch(0.38 0.008 230)" }}>{page.issueTypes.length}</div>
              </div>
              {/* Score breakdown chips */}
              <div style={{ paddingLeft: "60px", marginTop: "5px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {checks.map(c => (
                  <span key={c.label} style={{
                    fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px",
                    background: c.ok ? "oklch(0.68 0.16 155 / 0.12)" : "oklch(0.65 0.20 27 / 0.12)",
                    color: c.ok ? "oklch(0.68 0.16 155)" : "oklch(0.65 0.20 27)",
                    border: `1px solid ${c.ok ? "oklch(0.68 0.16 155 / 0.2)" : "oklch(0.65 0.20 27 / 0.2)"}`,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    {c.ok ? "✓" : "✗"} {c.label}
                  </span>
                ))}
              </div>
              {needsTitle && (
                <div style={{ paddingLeft: "60px", marginTop: "4px" }}>
                  <AiTitleSuggester auditId={auditId} url={page.url} currentTitle={page.title} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
