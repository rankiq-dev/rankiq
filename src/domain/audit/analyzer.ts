import type { CrawlResult, CrawledPage } from "./types"
import type { NewAuditIssue } from "@/db/schema"

const MAX_SAMPLE_URLS = 50  /* cap URLs stored per issue */

type IssueBuilder = (
  pages: CrawledPage[],
  result: CrawlResult,
  auditId: string
) => NewAuditIssue | null

/** Group pages by a predicate and build an issue if any match */
function pageIssue(
  auditId: string,
  pages: CrawledPage[],
  opts: {
    type: NewAuditIssue["type"]
    severity: NewAuditIssue["severity"]
    category: NewAuditIssue["category"]
    title: string
    description: string
    fixInstructions?: string
    predicate: (p: CrawledPage) => boolean
  }
): NewAuditIssue | null {
  const affected = pages.filter(opts.predicate)
  if (affected.length === 0) return null
  return {
    auditId,
    type: opts.type,
    severity: opts.severity,
    category: opts.category,
    title: opts.title,
    description: opts.description,
    affectedUrls: affected.slice(0, MAX_SAMPLE_URLS).map((p) => p.url),
    affectedCount: affected.length,
    fixInstructions: opts.fixInstructions ?? null,
    revenueImpactRank: null,  /* assigned by M4 AI Action Plan */
    isFixed: false,
    fixedAt: null,
  }
}

const ISSUE_BUILDERS: IssueBuilder[] = [
  /* ── Critical ─────────────────────────────────────────────────────── */

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "missing_title_tag",
      severity: "critical",
      category: "on_page",
      title: "Pages missing title tag",
      description:
        "These pages have no <title> tag. Title tags are the single most important on-page SEO element — search engines use them as the headline in results.",
      predicate: (p) => p.status === 200 && !p.title,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "missing_h1",
      severity: "critical",
      category: "on_page",
      title: "Pages missing an H1 heading",
      description:
        "These pages have no H1 tag. The H1 signals the main topic of a page to both users and search engines.",
      predicate: (p) => p.status === 200 && p.h1Count === 0,
    }),

  (pages, result, auditId) => {
    if (result.brokenLinks.length === 0) return null
    const affectedUrls = Array.from(new Set(result.brokenLinks.map((l) => l.from))).slice(0, MAX_SAMPLE_URLS)
    return {
      auditId,
      type: "broken_internal_link",
      severity: "critical",
      category: "technical",
      title: "Broken internal links (4xx)",
      description: `${result.brokenLinks.length} internal link(s) point to pages returning a 4xx error. Broken links harm both user experience and crawl budget.`,
      affectedUrls,
      affectedCount: result.brokenLinks.length,
      fixInstructions: null,
      revenueImpactRank: null,
      isFixed: false,
      fixedAt: null,
    }
  },

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "robots_noindex",
      severity: "critical",
      category: "technical",
      title: "Pages blocked from indexing (noindex)",
      description:
        'These pages have <meta name="robots" content="noindex">. If unintentional, search engines will never rank them.',
      predicate: (p) =>
        p.status === 200 && (p.metaRobots?.toLowerCase().includes("noindex") ?? false),
    }),

  /* ── Warning ───────────────────────────────────────────────────────── */

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "missing_meta_description",
      severity: "warning",
      category: "on_page",
      title: "Pages missing meta description",
      description:
        "These pages have no meta description. While not a direct ranking factor, meta descriptions appear in search snippets and directly affect click-through rates.",
      predicate: (p) => p.status === 200 && !p.metaDescription,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "title_too_long",
      severity: "warning",
      category: "on_page",
      title: "Title tags too long (>60 characters)",
      description:
        "These page titles exceed 60 characters and will be truncated in Google search results, reducing their effectiveness.",
      predicate: (p) => p.status === 200 && !!p.title && p.title.length > 60,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "title_too_short",
      severity: "warning",
      category: "on_page",
      title: "Title tags too short (<20 characters)",
      description:
        "These page titles are very short and unlikely to target meaningful keywords. Titles under 20 characters miss an opportunity to describe the page's content.",
      predicate: (p) => p.status === 200 && !!p.title && p.title.length < 20,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "multiple_h1_tags",
      severity: "warning",
      category: "on_page",
      title: "Pages with multiple H1 tags",
      description:
        "These pages have more than one H1 tag. Multiple H1s dilute keyword signals and can confuse search engines about the page's primary topic.",
      predicate: (p) => p.status === 200 && p.h1Count > 1,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "no_canonical_tag",
      severity: "warning",
      category: "technical",
      title: "Pages without a canonical tag",
      description:
        "These pages have no <link rel='canonical'> tag. Without a canonical, search engines may index duplicate versions of the same page, splitting ranking signals.",
      predicate: (p) => p.status === 200 && !p.canonical,
    }),

  (pages, result, auditId) => {
    if (result.redirectChains.length === 0) return null
    return {
      auditId,
      type: "redirect_chain",
      severity: "warning",
      category: "technical",
      title: "Redirect chains detected",
      description: `${result.redirectChains.length} URL(s) pass through 3+ redirects before reaching their destination. Redirect chains slow down crawling and dilute link equity.`,
      affectedUrls: result.redirectChains.map((c) => c.chain[0] ?? "").filter(Boolean).slice(0, MAX_SAMPLE_URLS),
      affectedCount: result.redirectChains.length,
      fixInstructions: null,
      revenueImpactRank: null,
      isFixed: false,
      fixedAt: null,
    }
  },

  /* ── Info ──────────────────────────────────────────────────────────── */

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "meta_description_too_long",
      severity: "info",
      category: "on_page",
      title: "Meta descriptions too long (>160 characters)",
      description:
        "These meta descriptions exceed 160 characters and will be truncated in search results.",
      predicate: (p) =>
        p.status === 200 && !!p.metaDescription && p.metaDescription.length > 160,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "thin_content",
      severity: "info",
      category: "content",
      title: "Pages with thin content (<300 words)",
      description:
        "These pages have fewer than 300 words. Thin pages may rank poorly as they provide limited value to users.",
      predicate: (p) => p.status === 200 && p.wordCount < 300,
    }),

  /* ── M3 on-page ────────────────────────────────────────────────────── */

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "images_missing_alt",
      severity: "warning",
      category: "on_page",
      title: "Images missing alt text",
      description:
        "These pages contain images without alt attributes. Alt text is required for accessibility and helps search engines understand image content, contributing to image search rankings.",
      predicate: (p) => p.status === 200 && p.imagesMissingAlt > 0,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "poor_internal_linking",
      severity: "warning",
      category: "on_page",
      title: "Pages with poor internal linking (<2 incoming links)",
      description:
        "These pages receive fewer than 2 internal links from the rest of the site. Pages with few incoming internal links are harder for search engines to discover and rank well.",
      predicate: (p) =>
        p.status === 200 &&
        p.incomingInternalLinks < 2 &&
        !p.url.match(/\/$/) /* exclude homepage */,
    }),

  (pages, _, auditId) =>
    pageIssue(auditId, pages, {
      type: "no_heading_hierarchy",
      severity: "info",
      category: "on_page",
      title: "Pages with no heading structure (no H2s)",
      description:
        "These pages have body content but no H2 subheadings. A clear heading hierarchy helps users scan content and gives search engines additional context about topics covered.",
      predicate: (p) => p.status === 200 && p.wordCount >= 300 && p.h2Count === 0,
    }),
]

/**
 * Compute a site health score 0–100 from the issue list.
 * Formula: start at 100, subtract weighted penalty per issue.
 * critical: 10 pts × min(affectedCount, 5)
 * warning:   4 pts × min(affectedCount, 5)
 * info:       1 pt  × min(affectedCount, 5)
 */
export function computeHealthScore(issues: NewAuditIssue[]): number {
  let penalty = 0
  for (const issue of issues) {
    const count = Math.min(issue.affectedCount ?? 0, 5)
    if (issue.severity === "critical") penalty += 10 * count
    else if (issue.severity === "warning") penalty += 4 * count
    else penalty += 1 * count
  }
  return Math.max(0, Math.min(100, 100 - penalty))
}

/** Run all issue detectors and return typed NewAuditIssue rows ready for bulk insert */
export function analyzePages(auditId: string, result: CrawlResult): NewAuditIssue[] {
  const indexable = result.pages.filter((p) => p.status === 200)
  const issues: NewAuditIssue[] = []

  for (const builder of ISSUE_BUILDERS) {
    const issue = builder(indexable.length > 0 ? indexable : result.pages, result, auditId)
    if (issue) issues.push(issue)
  }

  return issues
}

/**
 * Compute per-URL on-page score (0–100) and build PageAnalysis records.
 * Called after analyzePages() so we can cross-reference which issue types affect each URL.
 *
 * onPageScore formula — start at 100, subtract for each deficiency:
 *   missing title:           -20   missing H1:      -15
 *   title too long/short:    -5    multiple H1s:    -5
 *   missing meta desc:       -10   no canonical:    -5
 *   meta desc too long:      -3    noindex:         -30
 *   no heading hierarchy:    -5    thin content:    -5
 *   images missing alt:      -3    poor int. links: -5
 */
export function buildPageAnalyses(
  pages: CrawledPage[],
  issues: NewAuditIssue[]
): import("./types").PageAnalysis[] {
  /* Build a lookup: url → set of issue types affecting it */
  const urlIssueMap = new Map<string, Set<string>>()
  for (const issue of issues) {
    for (const url of (issue.affectedUrls as string[]) ?? []) {
      if (!urlIssueMap.has(url)) urlIssueMap.set(url, new Set())
      urlIssueMap.get(url)!.add(issue.type)
    }
  }

  return pages
    .filter((p) => p.status === 200)
    .map((p) => {
      const issueTypes = Array.from(urlIssueMap.get(p.url) ?? new Set<string>())
      const has = (type: string) => issueTypes.includes(type)

      let score = 100
      if (!p.title)                          score -= 20
      else if (p.title.length > 60)          score -= 5
      else if (p.title.length < 20)          score -= 5
      if (!p.metaDescription)                score -= 10
      else if (p.metaDescription.length > 160) score -= 3
      if (p.h1Count === 0)                   score -= 15
      else if (p.h1Count > 1)                score -= 5
      if (!p.canonical)                      score -= 5
      if (p.metaRobots?.toLowerCase().includes("noindex")) score -= 30
      if (p.wordCount >= 300 && p.h2Count === 0) score -= 5
      if (p.wordCount < 300)                 score -= 5
      if (has("images_missing_alt"))         score -= 3
      if (has("poor_internal_linking"))      score -= 5

      return {
        url: p.url,
        onPageScore: Math.max(0, Math.min(100, score)),
        title: p.title,
        titleLength: p.title?.length ?? 0,
        metaDescription: p.metaDescription,
        metaDescriptionLength: p.metaDescription?.length ?? 0,
        h1Text: p.h1Text,
        h1Count: p.h1Count,
        h2Count: p.h2Count,
        h3Count: p.h3Count,
        wordCount: p.wordCount,
        internalLinkCount: p.internalLinks.length,
        incomingInternalLinks: p.incomingInternalLinks,
        imageCount: p.imageCount,
        imagesMissingAlt: p.imagesMissingAlt,
        hasCanonical: !!p.canonical,
        hasJsonLd: p.hasJsonLd,
        isNoindex: p.metaRobots?.toLowerCase().includes("noindex") ?? false,
        issueTypes,
      }
    })
}
