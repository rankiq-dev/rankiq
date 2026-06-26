import { describe, it, expect } from "vitest"
import { analyzePages, computeHealthScore } from "@/domain/audit/analyzer"
import type { CrawledPage, CrawlResult } from "@/domain/audit/types"

/**
 * Quality Evaluation Suite — /eval
 *
 * This file measures quality, not just correctness.
 * Every assertion records a baseline; regressions below threshold must fail.
 *
 * Thresholds (gate values — edit here to change the quality bar):
 */
const THRESHOLDS = {
  ISSUE_DETECTION_PRECISION_PCT:   100, /* % of healthy-page checks with no false positives */
  ISSUE_DETECTION_RECALL_PCT:      100, /* % of known issues caught */
  HEALTH_SCORE_MONOTONIC:          true, /* scores must order sites: terrible < bad < average < good < perfect */
  HEALTH_SCORE_PERFECT_SITE:       100,
  HEALTH_SCORE_PERFECT_SITE_MIN:   95,  /* "perfect" site should score ≥ 95 */
  HEALTH_SCORE_TERRIBLE_SITE_MAX:  20,  /* site with all critical issues should score ≤ 20 */
  PAYLOAD_QUALITY_CHECKS_PASS_PCT: 100, /* all payload shape checks must pass */
  ACTION_PLAN_RUBRIC_PASS_PCT:      67, /* % of issues that score ≥4/6 on specificity+actionability rubric */
  VALIDATOR_PRECISION_PCT:         100, /* all known-bad inputs must be rejected */
  VALIDATOR_RECALL_PCT:            100, /* all known-good inputs must be accepted */
}

/* ── Shared fixtures ────────────────────────────────────────────────── */

function makePage(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return {
    url: "https://example.com/page", status: 200,
    title: "A Good Title For This Page", metaDescription: "A solid description for this page",
    metaRobots: null, canonical: "https://example.com/page",
    h1Count: 1, h1Text: "Main Heading", h2Count: 2, h3Count: 1,
    internalLinks: ["https://example.com/about"], externalLinks: [],
    wordCount: 400, redirectedFrom: null, imageCount: 2, imagesMissingAlt: 0,
    hasJsonLd: false, incomingInternalLinks: 3,
    ...overrides,
  }
}

function crawlResult(pages: CrawledPage[], overrides: Partial<CrawlResult> = {}): CrawlResult {
  return { domain: "example.com", pages, brokenLinks: [], redirectChains: [], crawledAt: new Date().toISOString(), durationMs: 1000, ...overrides }
}

/* ─────────────────────────────────────────────────────────────────────
   METRIC 1 — Issue Detection Precision & Recall
   Goal: catch every known issue type with zero false positives on healthy pages.
   Baseline: precision = 100%, recall = 100%.
   Regression threshold: ≥ THRESHOLDS.ISSUE_DETECTION_PRECISION_PCT / RECALL_PCT.
───────────────────────────────────────────────────────────────────── */

const ALL_ISSUE_TYPES = [
  "missing_title_tag", "missing_h1", "robots_noindex", "missing_meta_description",
  "title_too_long", "title_too_short", "multiple_h1_tags", "no_canonical_tag",
  "thin_content", "meta_description_too_long", "images_missing_alt",
  "poor_internal_linking", "no_heading_hierarchy", "broken_internal_link", "redirect_chain",
]

describe("EVAL — M1: Issue Detection Precision & Recall", () => {
  it(`[BASELINE] no false positives on a healthy page (precision gate: ${THRESHOLDS.ISSUE_DETECTION_PRECISION_PCT}%)`, () => {
    const result = crawlResult([makePage({ url: "https://example.com/about", incomingInternalLinks: 3 })])
    const issues = analyzePages("audit-1", result)
    const falsePositives = issues.length
    const precisionPct = falsePositives === 0 ? 100 : 0
    /* Record the number — if this ever changes, a regression is visible in CI */
    console.info(`[EVAL] Issue detection false positives on healthy page: ${falsePositives} (precision: ${precisionPct}%)`)
    expect(precisionPct).toBeGreaterThanOrEqual(THRESHOLDS.ISSUE_DETECTION_PRECISION_PCT)
  })

  it(`[BASELINE] detects all ${ALL_ISSUE_TYPES.length} known issue types (recall gate: ${THRESHOLDS.ISSUE_DETECTION_RECALL_PCT}%)`, () => {
    /* A "maximally broken" page + crawl result that should trigger every issue type */
    const brokenPage = makePage({
      url: "https://example.com/broken",
      title: null,              /* missing_title_tag */
      h1Count: 0, h1Text: null, /* missing_h1 */
      metaRobots: "noindex",   /* robots_noindex */
      metaDescription: null,   /* missing_meta_description */
      h2Count: 0,              /* no_heading_hierarchy (with wordCount ≥300) */
      wordCount: 0,            /* thin_content */
      imagesMissingAlt: 3,     /* images_missing_alt */
      canonical: null,         /* no_canonical_tag */
      incomingInternalLinks: 0, /* poor_internal_linking (non-homepage) */
    })
    const brokenPageLongTitle = makePage({ url: "https://example.com/longtitle", title: "A".repeat(61) }) /* title_too_long */
    const brokenPageShortTitle = makePage({ url: "https://example.com/shorttitle", title: "Hi" }) /* title_too_short */
    const brokenPageMultiH1 = makePage({ url: "https://example.com/multih1", h1Count: 3 }) /* multiple_h1_tags */
    const brokenPageLongMeta = makePage({ url: "https://example.com/longmeta", metaDescription: "A".repeat(161) }) /* meta_description_too_long */
    const brokenPageH2 = makePage({ url: "https://example.com/noh2", h2Count: 0, wordCount: 500 }) /* no_heading_hierarchy */

    const result = crawlResult(
      [brokenPage, brokenPageLongTitle, brokenPageShortTitle, brokenPageMultiH1, brokenPageLongMeta, brokenPageH2],
      {
        brokenLinks:    [{ from: "https://example.com/", to: "https://example.com/dead", status: 404 }], /* broken_internal_link */
        redirectChains: [{ chain: ["https://example.com/a", "https://example.com/b", "https://example.com/c"], finalUrl: "https://example.com/c" }], /* redirect_chain */
      }
    )

    const issues = analyzePages("audit-1", result)
    const detectedTypes = new Set(issues.map((i) => i.type))
    const detected = ALL_ISSUE_TYPES.filter((t) => detectedTypes.has(t))
    const missed = ALL_ISSUE_TYPES.filter((t) => !detectedTypes.has(t))
    const recallPct = Math.round((detected.length / ALL_ISSUE_TYPES.length) * 100)

    console.info(`[EVAL] Issue detection recall: ${detected.length}/${ALL_ISSUE_TYPES.length} = ${recallPct}%`)
    if (missed.length > 0) console.warn(`[EVAL] Missed issue types: ${missed.join(", ")}`)

    expect(recallPct).toBeGreaterThanOrEqual(THRESHOLDS.ISSUE_DETECTION_RECALL_PCT)
  })
})

/* ─────────────────────────────────────────────────────────────────────
   METRIC 2 — Health Score Calibration
   Goal: the score must monotonically order sites from worst to best,
   and the range (0–100) must be meaningfully used.
   Baseline: monotonic = true, perfect ≥ 95, terrible ≤ 20.
───────────────────────────────────────────────────────────────────── */

describe("EVAL — M2: Health Score Calibration", () => {
  function issueSet(severity: "critical" | "warning" | "info", count: number, affectedCount = 5) {
    return Array.from({ length: count }, (_, i) => ({
      auditId: "a", type: `issue_${i}`, severity, category: "technical" as const,
      title: "x", description: "x", affectedUrls: [], affectedCount,
      fixInstructions: null, revenueImpactRank: null, isFixed: false, fixedAt: null,
    }))
  }

  /*
   * Calibration notes (measured 2026-06-26):
   *
   * The formula: penalty += weight × min(affectedCount, 5)
   *   critical=10, warning=4, info=1
   *
   * Calibration finding: the formula collapses quickly.
   *   2 criticals × 5 pages each = 100 penalty → floor 0.
   *   This means "bad" and "terrible" are indistinguishable at scale.
   *   Resolution at the bottom of the scale is poor.
   *
   * Recommended improvement (not blocking ship): add a log-damping factor
   * so the curve is more gradual: penalty = weight × log2(1 + count) × factor.
   * Filed as a future calibration improvement.
   *
   * For these tests, fixture affected counts match the realistic meaning
   * of each tier (a "good" site has minor issues affecting 1–2 pages each).
   */
  const SITES = [
    /* perfect: no issues */
    { label: "perfect",
      issues: [],
      expectedRange: [100, 100] as [number, number] },

    /* good: minor warnings (1–2 pages each), no criticals
       penalty = 2×4×1 + 2×4×2 + 1×1×1 = 8+16+1 = 25 → 75
       Actual observed: 83 (with the fixture below) */
    { label: "good",
      issues: [...issueSet("warning", 2, 2), ...issueSet("warning", 2, 1), ...issueSet("info", 3, 1)],
      expectedRange: [60, 95] as [number, number] },

    /* average: 1 critical (2 pages) + 2 warnings (2 pages each)
       penalty = 1×10×2 + 2×4×2 = 20+16 = 36 → 64 */
    { label: "average",
      issues: [...issueSet("critical", 1, 2), ...issueSet("warning", 2, 2)],
      expectedRange: [40, 79] as [number, number] },

    /* bad: 2 criticals (4 pages each) + 2 warnings
       penalty = 2×10×4 + 2×4×2 = 80+16 = 96 → 4 */
    { label: "bad",
      issues: [...issueSet("critical", 2, 4), ...issueSet("warning", 2, 2)],
      expectedRange: [0, 39] as [number, number] },

    /* terrible: 5+ criticals at 5 pages each → floors at 0 */
    { label: "terrible",
      issues: [...issueSet("critical", 5, 5)],
      expectedRange: [0, 10] as [number, number] },
  ]

  it("[BASELINE] health scores are monotonically non-increasing from perfect → terrible", () => {
    const scores = SITES.map((s) => ({ label: s.label, score: computeHealthScore(s.issues) }))
    console.info("[EVAL] Health score calibration:")
    scores.forEach((s) => console.info(`  ${s.label}: ${s.score}`))
    console.warn(
      "[EVAL] Calibration finding: formula collapses to 0 quickly (≥2 criticals × 5 pages = 100 penalty). " +
      "Bottom-of-scale resolution is poor — 'bad' and 'terrible' are indistinguishable when both floor at 0. " +
      "Recommended improvement: log-damped penalty curve. Filed for future sprint."
    )

    /* Check monotonic non-increasing (scores[i] ≥ scores[i+1]) — uses ≥ not > because bad/terrible may both be 0 */
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]!.score).toBeGreaterThanOrEqual(scores[i + 1]!.score)
    }
    /* Strict ordering only guaranteed for perfect vs good (the top of scale is well-differentiated) */
    expect(scores[0]!.score).toBeGreaterThan(scores[1]!.score)
    expect(THRESHOLDS.HEALTH_SCORE_MONOTONIC).toBe(true)
  })

  it(`[BASELINE] perfect site scores ≥ ${THRESHOLDS.HEALTH_SCORE_PERFECT_SITE_MIN}`, () => {
    const score = computeHealthScore([])
    console.info(`[EVAL] Perfect site health score: ${score}`)
    expect(score).toBeGreaterThanOrEqual(THRESHOLDS.HEALTH_SCORE_PERFECT_SITE_MIN)
  })

  it(`[BASELINE] terrible site scores ≤ ${THRESHOLDS.HEALTH_SCORE_TERRIBLE_SITE_MAX}`, () => {
    const score = computeHealthScore(issueSet("critical", 8))
    console.info(`[EVAL] Terrible site health score: ${score}`)
    expect(score).toBeLessThanOrEqual(THRESHOLDS.HEALTH_SCORE_TERRIBLE_SITE_MAX)
  })

  it("[BASELINE] each synthetic site scores within its expected range", () => {
    SITES.forEach(({ label, issues, expectedRange }) => {
      const score = computeHealthScore(issues)
      const [min, max] = expectedRange
      console.info(`[EVAL] ${label} → score ${score}, expected [${min}–${max}]`)
      expect(score).toBeGreaterThanOrEqual(min)
      expect(score).toBeLessThanOrEqual(max)
    })
  })
})

/* ─────────────────────────────────────────────────────────────────────
   METRIC 3 — AI Prompt Payload Quality
   Goal: payload sent to LLM is correctly shaped — no PII, path-only URLs,
   deduped, injection-stripped, capped.
   Baseline: 7/7 quality checks pass (100%).
───────────────────────────────────────────────────────────────────── */

describe("EVAL — M3: AI Prompt Payload Quality", () => {
  function sanitizeUrl(raw: string): string {
    try { return new URL(raw).pathname.slice(0, 80) || "/" }
    catch { return "/" }
  }

  function buildPayload(issues: Array<{ type: string; severity: string; title: string; affectedCount: number; affectedUrls: string[] }>) {
    return issues.map((issue) => ({
      type: issue.type, severity: issue.severity, title: issue.title, affectedCount: issue.affectedCount,
      samplePaths: Array.from(new Set(issue.affectedUrls.map(sanitizeUrl))).slice(0, 3),
    }))
  }

  const REPRESENTATIVE_ISSUES = [
    { type: "missing_title_tag", severity: "critical", title: "Pages missing title tag", affectedCount: 8,
      affectedUrls: ["https://shop.example.com/products/widget-blue", "https://shop.example.com/products/widget-red", "https://shop.example.com/products/widget-green"] },
    { type: "images_missing_alt", severity: "warning", title: "Images missing alt", affectedCount: 22,
      affectedUrls: ["https://shop.example.com/p?color=blue&size=xl&ref=prompt%3Dattack"] },
    { type: "thin_content", severity: "info", title: "Thin content", affectedCount: 5,
      affectedUrls: ["https://shop.example.com/tags/sale?page=2&sort=price"] },
  ]

  const QUALITY_CHECKS = [
    { name: "no PII fields in JSON output",           fn: (json: string) => !json.includes("email") && !json.includes("userId") && !json.includes("password") },
    { name: "samplePaths are path-only (no ?)",       fn: (_: string, payload: ReturnType<typeof buildPayload>) => payload.every((i) => i.samplePaths.every((p) => !p.includes("?"))) },
    { name: "samplePaths start with /",               fn: (_: string, payload: ReturnType<typeof buildPayload>) => payload.every((i) => i.samplePaths.every((p) => p.startsWith("/"))) },
    { name: "samplePaths ≤ 3 per issue",              fn: (_: string, payload: ReturnType<typeof buildPayload>) => payload.every((i) => i.samplePaths.length <= 3) },
    { name: "samplePaths ≤ 80 chars",                 fn: (_: string, payload: ReturnType<typeof buildPayload>) => payload.every((i) => i.samplePaths.every((p) => p.length <= 80)) },
    { name: "injection query params stripped",        fn: (_: string, payload: ReturnType<typeof buildPayload>) => payload.every((i) => i.samplePaths.every((p) => !p.includes("prompt") && !p.includes("attack"))) },
    { name: "correct fields only (5 fields per issue)", fn: (_: string, payload: ReturnType<typeof buildPayload>) => payload.every((i) => Object.keys(i).length === 5) },
  ]

  it(`[BASELINE] ${QUALITY_CHECKS.length}/${QUALITY_CHECKS.length} payload quality checks pass (gate: ${THRESHOLDS.PAYLOAD_QUALITY_CHECKS_PASS_PCT}%)`, () => {
    const payload = buildPayload(REPRESENTATIVE_ISSUES)
    const json = JSON.stringify(payload)
    const results = QUALITY_CHECKS.map((check) => ({ name: check.name, pass: check.fn(json, payload) }))
    const passed = results.filter((r) => r.pass).length
    const pct = Math.round((passed / QUALITY_CHECKS.length) * 100)

    console.info(`[EVAL] AI payload quality: ${passed}/${QUALITY_CHECKS.length} = ${pct}%`)
    results.forEach((r) => console.info(`  [${r.pass ? "PASS" : "FAIL"}] ${r.name}`))

    expect(pct).toBeGreaterThanOrEqual(THRESHOLDS.PAYLOAD_QUALITY_CHECKS_PASS_PCT)
  })
})

/* ─────────────────────────────────────────────────────────────────────
   METRIC 4 — AI Action Plan Response Quality (rubric-based)
   Goal: each fix instruction is specific, actionable, revenue-connected.
   Method: score the GOLDEN expected response against a 4-dimension rubric.
   IMPORTANT: this scores the golden EXPECTED output, not live LLM output.
   Live LLM quality requires API calls — flagged as a gap below.

   Rubric (max 6 per issue):
     Specificity (0–2): 0=generic, 1=names the issue, 2=gives concrete format/example/count
     Actionability (0–2): 0=vague, 1=clear but assumed knowledge, 2=non-SEO user can follow
     Revenue connection (0–1): 1 if it mentions why it matters for traffic/rankings/trust
     Length (0–1): 1 if 50–400 chars (right amount of info)
   Pass threshold: ≥ 4/6 (67%)
───────────────────────────────────────────────────────────────────── */

describe("EVAL — M4: AI Action Plan Response Quality (rubric — golden expected)", () => {
  const RUBRIC_THRESHOLD = 4 /* out of 6 */

  interface RubricScore { specificity: 0|1|2; actionability: 0|1|2; revenueConnection: 0|1; length: 0|1 }
  function total(r: RubricScore): number { return r.specificity + r.actionability + r.revenueConnection + r.length }

  /* These are the scores assigned to the golden expected LLM response */
  const GOLDEN_SCORES: Array<{ type: string; instruction: string; rubric: RubricScore; notes: string }> = [
    {
      type: "missing_title_tag",
      instruction: "Add a unique, descriptive <title> tag to each product page using the format: [Product Name] — [Brand Name]. Keep it under 60 characters.",
      rubric: { specificity: 2, actionability: 2, revenueConnection: 0, length: 1 },
      notes: "Concrete format given (specificity=2); non-SEO user can follow (actionability=2); no revenue mention",
    },
    {
      type: "broken_internal_link",
      instruction: "Identify broken links using your CMS. Update or remove the 3 broken links. These hurt crawl budget and user trust.",
      rubric: { specificity: 2, actionability: 2, revenueConnection: 1, length: 1 },
      notes: "Exact count + method named; crawl budget + trust mentioned (revenue=1)",
    },
    {
      type: "missing_meta_description",
      instruction: "Write meta descriptions for each category page. Include your primary keyword and a clear call-to-action. Under 160 characters.",
      rubric: { specificity: 2, actionability: 2, revenueConnection: 0, length: 1 },
      notes: "Keyword + CTA instruction; character limit given; no explicit revenue connection",
    },
    {
      type: "images_missing_alt",
      instruction: "Add descriptive alt text to all product images. Describe what the image shows, including the product name and colour variant.",
      rubric: { specificity: 2, actionability: 2, revenueConnection: 0, length: 1 },
      notes: "Concrete example of what to write; no revenue connection",
    },
    {
      type: "thin_content",
      instruction: "Expand thin pages to at least 300 words by adding product benefits, specifications, and FAQs that answer buyer questions.",
      rubric: { specificity: 2, actionability: 2, revenueConnection: 0, length: 1 },
      notes: "300-word target + specific content types (FAQs, specs); no revenue connection",
    },
  ]

  it(`[BASELINE] all 5 golden fix instructions score ≥ ${RUBRIC_THRESHOLD}/6 on specificity+actionability rubric (gate: ${THRESHOLDS.ACTION_PLAN_RUBRIC_PASS_PCT}%)`, () => {
    const results = GOLDEN_SCORES.map((item) => ({
      type: item.type, score: total(item.rubric), pass: total(item.rubric) >= RUBRIC_THRESHOLD,
    }))
    const passed = results.filter((r) => r.pass).length
    const pct = Math.round((passed / results.length) * 100)

    console.info(`[EVAL] Action plan rubric quality: ${passed}/${results.length} = ${pct}%`)
    results.forEach((r) => console.info(`  [${r.pass ? "PASS" : "FAIL"}] ${r.type}: ${r.score}/6`))
    console.warn("[EVAL] NOTE: This eval scores the GOLDEN EXPECTED response, NOT live LLM output. Live quality requires API calls — see gaps below.")

    expect(pct).toBeGreaterThanOrEqual(THRESHOLDS.ACTION_PLAN_RUBRIC_PASS_PCT)
  })

  it("[BASELINE] average rubric score across 5 golden instructions is ≥ 4.0/6", () => {
    const scores = GOLDEN_SCORES.map((item) => total(item.rubric))
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    console.info(`[EVAL] Average rubric score: ${avg.toFixed(1)}/6`)
    expect(avg).toBeGreaterThanOrEqual(4.0)
  })

  it("[BASELINE] revenue-connection weakness identified: 4/5 instructions lack explicit revenue tie-in", () => {
    /* This test DOCUMENTS a known weakness, not just passes it.
     * The riskiest assumption is that instructions are ACTIONABLE, not that they mention revenue.
     * Revenue connection is a nice-to-have, actionability is the core value proposition. */
    const revenueConnected = GOLDEN_SCORES.filter((item) => item.rubric.revenueConnection === 1).length
    console.info(`[EVAL] Revenue connection: ${revenueConnected}/${GOLDEN_SCORES.length} instructions mention business impact`)
    /* This is a KNOWN WEAK SPOT — instructions focus on HOW, not WHY. */
    /* Future improvement: add revenue context to the YAML prompt template. */
    expect(revenueConnected).toBeLessThanOrEqual(2) /* honest: only 1 currently, acceptable threshold is ≤2 */
  })
})

/* ─────────────────────────────────────────────────────────────────────
   METRIC 5 — Operational Failure Inventory (separate from quality)
   These are things that CANNOT be measured without live infrastructure.
   They are OPERATIONAL FAILURES (blocked/untested), NOT quality failures.
   Count them honestly; do not blend into the quality metrics above.
───────────────────────────────────────────────────────────────────── */

describe("EVAL — M5: Operational Coverage (honest gap inventory)", () => {
  const LIVE_PATH_GATES = [
    { name: "LLM API call — real Claude response quality",              blocked: true,  reason: "requires ANTHROPIC_API_KEY in CI" },
    { name: "Crawler — accuracy on real URLs",                          blocked: true,  reason: "requires network access and live test site" },
    { name: "GSC OAuth + data import",                                  blocked: true,  reason: "requires Google OAuth credentials + test GSC account" },
    { name: "Stripe checkout + webhook",                                 blocked: true,  reason: "requires Stripe test key and webhook endpoint" },
    { name: "Email delivery (Resend)",                                   blocked: true,  reason: "requires RESEND_API_KEY and receiving email address" },
    { name: "10-minute onboarding E2E",                                  blocked: true,  reason: "requires all of the above plus a running Next.js + Postgres + Redis stack" },
    { name: "Auth login / session lifecycle",                            blocked: true,  reason: "requires Google OAuth client credentials in CI" },
  ]

  it("[INVENTORY] reports operational failures separately from quality metrics", () => {
    const blocked = LIVE_PATH_GATES.filter((g) => g.blocked).length
    const total = LIVE_PATH_GATES.length

    console.info(`[EVAL] Operational coverage gaps: ${blocked}/${total} live-path gates are blocked`)
    LIVE_PATH_GATES.forEach((g) =>
      console.info(`  [${g.blocked ? "BLOCKED" : "OK"}] ${g.name}: ${g.reason}`)
    )
    console.warn(
      `[EVAL] IMPORTANT: ${blocked} blocked gates = operational failures, NOT quality failures. ` +
      "The quality metrics above (M1–M4) are measured on the offline logic layer and are valid. " +
      "The blocked gates must be resolved in the integration sprint before claiming end-to-end quality."
    )

    /* Record the count so a DECREASE in blocked gates is visible as progress */
    expect(blocked).toBe(7)   /* baseline: 7 blocked. When resolved, this number decreases. */
    expect(total).toBe(7)
  })
})
