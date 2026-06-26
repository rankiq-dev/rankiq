import { describe, it, expect } from "vitest"
import { analyzePages, computeHealthScore, buildPageAnalyses } from "@/domain/audit/analyzer"
import type { CrawlResult, CrawledPage } from "@/domain/audit/types"

/* ── Test fixtures ─────────────────────────────────────────────────── */

function makePage(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return {
    url:                   "https://example.com/page",
    status:                200,
    title:                 "A Good Title For This Page Here",
    metaDescription:       "A good meta description for the page",
    metaRobots:            null,
    canonical:             "https://example.com/page",
    h1Count:               1,
    h1Text:                "Main Heading",
    h2Count:               2,
    h3Count:               1,
    internalLinks:         ["https://example.com/about"],
    externalLinks:         [],
    wordCount:             400,
    redirectedFrom:        null,
    imageCount:            2,
    imagesMissingAlt:      0,
    hasJsonLd:             false,
    incomingInternalLinks: 3,
    ...overrides,
  }
}

function makeCrawlResult(pages: CrawledPage[] = [], overrides: Partial<CrawlResult> = {}): CrawlResult {
  return {
    domain:         "example.com",
    pages,
    brokenLinks:    [],
    redirectChains: [],
    crawledAt:      new Date().toISOString(),
    durationMs:     1000,
    ...overrides,
  }
}

const AID = "audit-uuid-1"

/* ── analyzePages ──────────────────────────────────────────────────── */

describe("analyzePages — issue detection", () => {
  it("returns no issues for a perfectly healthy page", () => {
    const result = makeCrawlResult([makePage()])
    const issues = analyzePages(AID, result)
    expect(issues).toHaveLength(0)
  })

  it("detects missing_title_tag for page with no title", () => {
    const result = makeCrawlResult([makePage({ title: null })])
    const issues = analyzePages(AID, result)
    const types = issues.map((i) => i.type)
    expect(types).toContain("missing_title_tag")
  })

  it("detects missing_h1 for page with h1Count=0", () => {
    const result = makeCrawlResult([makePage({ h1Count: 0, h1Text: null })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("missing_h1")
  })

  it("detects robots_noindex for page with noindex robots meta", () => {
    const result = makeCrawlResult([makePage({ metaRobots: "noindex, nofollow" })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("robots_noindex")
  })

  it("detects missing_meta_description", () => {
    const result = makeCrawlResult([makePage({ metaDescription: null })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("missing_meta_description")
  })

  it("detects title_too_long for title >60 chars", () => {
    const result = makeCrawlResult([makePage({ title: "A".repeat(61) })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("title_too_long")
  })

  it("does NOT flag title_too_long for title exactly 60 chars", () => {
    const result = makeCrawlResult([makePage({ title: "A".repeat(60) })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).not.toContain("title_too_long")
  })

  it("detects title_too_short for title <20 chars", () => {
    const result = makeCrawlResult([makePage({ title: "Short" })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("title_too_short")
  })

  it("detects multiple_h1_tags for page with h1Count>1", () => {
    const result = makeCrawlResult([makePage({ h1Count: 3 })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("multiple_h1_tags")
  })

  it("detects no_canonical_tag for page with no canonical", () => {
    const result = makeCrawlResult([makePage({ canonical: null })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("no_canonical_tag")
  })

  it("detects thin_content for page with <300 words", () => {
    const result = makeCrawlResult([makePage({ wordCount: 150, h2Count: 0 })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("thin_content")
  })

  it("detects meta_description_too_long for meta >160 chars", () => {
    const result = makeCrawlResult([makePage({ metaDescription: "A".repeat(161) })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("meta_description_too_long")
  })

  it("detects images_missing_alt for page with imagesMissingAlt>0", () => {
    const result = makeCrawlResult([makePage({ imagesMissingAlt: 3 })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("images_missing_alt")
  })

  it("detects poor_internal_linking for non-homepage with <2 incoming links", () => {
    const result = makeCrawlResult([makePage({ url: "https://example.com/about", incomingInternalLinks: 1 })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("poor_internal_linking")
  })

  it("does NOT flag poor_internal_linking for homepage (trailing slash)", () => {
    const result = makeCrawlResult([makePage({ url: "https://example.com/", incomingInternalLinks: 0 })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).not.toContain("poor_internal_linking")
  })

  it("detects no_heading_hierarchy for page ≥300 words with no H2s", () => {
    const result = makeCrawlResult([makePage({ h2Count: 0, wordCount: 500 })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("no_heading_hierarchy")
  })

  it("does NOT flag no_heading_hierarchy for thin content page", () => {
    /* thin_content page (<300 words) should not also get no_heading_hierarchy */
    const result = makeCrawlResult([makePage({ h2Count: 0, wordCount: 150 })])
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).not.toContain("no_heading_hierarchy")
  })

  it("detects broken_internal_link when result has brokenLinks", () => {
    const result = makeCrawlResult([makePage()], {
      brokenLinks: [{ from: "https://example.com/page", to: "https://example.com/dead", status: 404 }],
    })
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("broken_internal_link")
  })

  it("detects redirect_chain when result has redirectChains", () => {
    const result = makeCrawlResult([makePage()], {
      redirectChains: [{ chain: ["https://example.com/a", "https://example.com/b", "https://example.com/c"], finalUrl: "https://example.com/c" }],
    })
    const issues = analyzePages(AID, result)
    expect(issues.map((i) => i.type)).toContain("redirect_chain")
  })

  it("skips non-200 pages for all page-level issue detectors", () => {
    const result = makeCrawlResult([makePage({ status: 404, title: null, h1Count: 0 })])
    const issues = analyzePages(AID, result)
    /* 404 page should not trigger missing_title_tag or missing_h1 */
    expect(issues.map((i) => i.type)).not.toContain("missing_title_tag")
    expect(issues.map((i) => i.type)).not.toContain("missing_h1")
  })

  it("affectedCount matches the number of matching pages", () => {
    const pages = [
      makePage({ url: "https://example.com/a", title: null }),
      makePage({ url: "https://example.com/b", title: null }),
      makePage({ url: "https://example.com/c", title: "Good Title Here" }),
    ]
    const issues = analyzePages(AID, makeCrawlResult(pages))
    const titleIssue = issues.find((i) => i.type === "missing_title_tag")
    expect(titleIssue?.affectedCount).toBe(2)
  })

  it("caps affectedUrls at MAX_SAMPLE_URLS (50)", () => {
    const pages = Array.from({ length: 60 }, (_, i) =>
      makePage({ url: `https://example.com/p${i}`, title: null })
    )
    const issues = analyzePages(AID, makeCrawlResult(pages))
    const titleIssue = issues.find((i) => i.type === "missing_title_tag")
    expect(titleIssue?.affectedUrls?.length).toBeLessThanOrEqual(50)
    expect(titleIssue?.affectedCount).toBe(60) /* full count preserved */
  })

  it("all issues have auditId set correctly", () => {
    const result = makeCrawlResult([makePage({ title: null, h1Count: 0 })])
    const issues = analyzePages(AID, result)
    expect(issues.every((i) => i.auditId === AID)).toBe(true)
  })

  it("all issues have isFixed=false and fixedAt=null initially", () => {
    const result = makeCrawlResult([makePage({ title: null })])
    const issues = analyzePages(AID, result)
    expect(issues.every((i) => i.isFixed === false && i.fixedAt === null)).toBe(true)
  })
})

/* ── computeHealthScore ────────────────────────────────────────────── */

describe("computeHealthScore", () => {
  it("returns 100 for no issues", () => {
    expect(computeHealthScore([])).toBe(100)
  })

  it("returns 0 (floor) when penalties exceed 100", () => {
    /* 11 critical issues × 5 pages × 10pts = 550 — should floor at 0 */
    const heavyIssues = Array.from({ length: 11 }, (_, i) => ({
      auditId: AID, type: `issue_${i}`, severity: "critical" as const,
      category: "technical" as const, title: "x", description: "x",
      affectedUrls: [], affectedCount: 10, fixInstructions: null,
      revenueImpactRank: null, isFixed: false, fixedAt: null,
    }))
    expect(computeHealthScore(heavyIssues)).toBe(0)
  })

  it("penalises critical issues at 10pts × min(count,5)", () => {
    const issue = {
      auditId: AID, type: "t", severity: "critical" as const,
      category: "technical" as const, title: "x", description: "x",
      affectedUrls: [], affectedCount: 2, fixInstructions: null,
      revenueImpactRank: null, isFixed: false, fixedAt: null,
    }
    /* 2 pages × 10 = 20 penalty → score 80 */
    expect(computeHealthScore([issue])).toBe(80)
  })

  it("caps per-issue penalty at 5 affected pages (not more)", () => {
    const issue = {
      auditId: AID, type: "t", severity: "critical" as const,
      category: "technical" as const, title: "x", description: "x",
      affectedUrls: [], affectedCount: 100 /* many pages */, fixInstructions: null,
      revenueImpactRank: null, isFixed: false, fixedAt: null,
    }
    /* Capped at min(100,5)=5 × 10 = 50 penalty → score 50 */
    expect(computeHealthScore([issue])).toBe(50)
  })

  it("penalises warnings at 4pts and info at 1pt", () => {
    const warning = {
      auditId: AID, type: "w", severity: "warning" as const,
      category: "technical" as const, title: "x", description: "x",
      affectedUrls: [], affectedCount: 1, fixInstructions: null,
      revenueImpactRank: null, isFixed: false, fixedAt: null,
    }
    const info = {
      ...warning, type: "i", severity: "info" as const,
    }
    /* 1×4 + 1×1 = 5 penalty → 95 */
    expect(computeHealthScore([warning, info])).toBe(95)
  })

  it("returns 100 (ceiling) when there are no penalties", () => {
    expect(computeHealthScore([])).toBeLessThanOrEqual(100)
    expect(computeHealthScore([])).toBeGreaterThanOrEqual(0)
  })
})

/* ── buildPageAnalyses ─────────────────────────────────────────────── */

describe("buildPageAnalyses", () => {
  it("produces one PageAnalysis per 200-status page", () => {
    const pages = [
      makePage({ url: "https://example.com/a" }),
      makePage({ url: "https://example.com/b", status: 404 }),
    ]
    const result = buildPageAnalyses(pages, [])
    expect(result).toHaveLength(1)
    expect(result[0]!.url).toBe("https://example.com/a")
  })

  it("score starts at 100 for a perfect page", () => {
    const [analysis] = buildPageAnalyses([makePage()], [])
    expect(analysis!.onPageScore).toBe(100)
  })

  it("deducts 20 for missing title", () => {
    const [analysis] = buildPageAnalyses([makePage({ title: null })], [])
    expect(analysis!.onPageScore).toBe(80)
  })

  it("deducts 15 for missing H1", () => {
    const [analysis] = buildPageAnalyses([makePage({ h1Count: 0, h1Text: null })], [])
    expect(analysis!.onPageScore).toBe(85)
  })

  it("deducts 30 for noindex", () => {
    const [analysis] = buildPageAnalyses([makePage({ metaRobots: "noindex" })], [])
    expect(analysis!.onPageScore).toBe(70)
  })

  it("score floors at 0", () => {
    const [analysis] = buildPageAnalyses([makePage({
      title: null, metaDescription: null, h1Count: 0, canonical: null,
      metaRobots: "noindex", h2Count: 0, wordCount: 100, imagesMissingAlt: 5,
      incomingInternalLinks: 0, url: "https://example.com/bad",
    })], [])
    expect(analysis!.onPageScore).toBeGreaterThanOrEqual(0)
  })

  it("records which issue types affect each URL", () => {
    const page = makePage({ title: null, url: "https://example.com/page" })
    const issue = {
      auditId: AID, type: "missing_title_tag", severity: "critical" as const,
      category: "on_page" as const, title: "x", description: "x",
      affectedUrls: ["https://example.com/page"], affectedCount: 1,
      fixInstructions: null, revenueImpactRank: null, isFixed: false, fixedAt: null,
    }
    const [analysis] = buildPageAnalyses([page], [issue])
    expect(analysis!.issueTypes).toContain("missing_title_tag")
  })
})
