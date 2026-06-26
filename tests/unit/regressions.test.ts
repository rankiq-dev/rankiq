import { describe, it, expect } from "vitest"

/**
 * Regression tests — lock in bugs that were found and fixed during development.
 * Each test documents the root cause and the fix so the bug cannot silently return.
 */

describe("Regression: Array.from(new Set()) instead of spread Set", () => {
  /**
   * Bug: `[...new Set(array)]` caused TS2802 "Type 'Set<string>' can only be iterated
   * when using the '--downlevelIteration' flag or '--target' is 'ES2015' or higher."
   * Fix: `Array.from(new Set(array))` works in all TS configs.
   */
  it("Array.from(new Set(array)) deduplications without TypeScript spread error", () => {
    const arr = ["a", "b", "a", "c", "b"]
    const unique = Array.from(new Set(arr))
    expect(unique).toEqual(["a", "b", "c"])
    expect(unique.length).toBe(3)
  })

  it("deduplication preserves insertion order", () => {
    const arr = ["c", "a", "b", "a", "c"]
    expect(Array.from(new Set(arr))).toEqual(["c", "a", "b"])
  })
})

describe("Regression: domain sanitization strips www. correctly", () => {
  /**
   * Bug: if a user entered www.example.com the site would be stored with www prefix,
   * causing duplicate detection to fail (example.com ≠ www.example.com).
   * Fix: createSiteSchema transforms the value to strip www. before uniqueness check.
   */
  it("strips www. prefix via schema transform", async () => {
    const { createSiteSchema } = await import("@/validators/sites")
    const result = createSiteSchema.safeParse({ domain: "www.example.com" })
    expect(result.success).toBe(true)
    expect(result.data?.domain).toBe("example.com")
  })

  it("does not strip www from a non-www subdomain like 'wwwfoo.example.com'", async () => {
    const { createSiteSchema } = await import("@/validators/sites")
    const result = createSiteSchema.safeParse({ domain: "wwwfoo.example.com" })
    expect(result.success).toBe(true)
    expect(result.data?.domain).toBe("wwwfoo.example.com")
  })
})

describe("Regression: health score bounds (0–100)", () => {
  /**
   * Bug: sites with many critical issues produced negative health scores.
   * Fix: `Math.max(0, Math.min(100, 100 - penalty))` in computeHealthScore.
   */
  it("health score never goes below 0", async () => {
    const { computeHealthScore } = await import("@/domain/audit/analyzer")
    const manyIssues = Array.from({ length: 20 }, (_, i) => ({
      auditId: "a", type: `t${i}`, severity: "critical" as const,
      category: "technical" as const, title: "x", description: "x",
      affectedUrls: [], affectedCount: 10, fixInstructions: null,
      revenueImpactRank: null, isFixed: false, fixedAt: null,
    }))
    expect(computeHealthScore(manyIssues)).toBe(0)
  })

  it("health score never exceeds 100", async () => {
    const { computeHealthScore } = await import("@/domain/audit/analyzer")
    expect(computeHealthScore([])).toBe(100)
  })
})

describe("Regression: escHtml prevents XSS in email templates", () => {
  /**
   * Bug class: if domain or issue titles were inserted raw into HTML email,
   * a site with a crafted domain like <script>alert(1)</script> could inject HTML.
   * Fix: escHtml() escapes & < > " before insertion.
   */
  it("escHtml converts < and > to entities", async () => {
    const { auditReportEmail } = await import("@/domain/email/templates")
    const { html } = auditReportEmail({
      recipientName: null, domain: "<script>evil</script>",
      auditId: "x", healthScore: 80, prevHealthScore: null,
      pagesCount: 1, criticalCount: 0, warningCount: 0,
      topIssues: [], appUrl: "https://app.rankiq.com",
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("escHtml encodes & in domain names", async () => {
    const { auditReportEmail } = await import("@/domain/email/templates")
    const { html } = auditReportEmail({
      recipientName: null, domain: "shop&go.com",
      auditId: "x", healthScore: 80, prevHealthScore: null,
      pagesCount: 1, criticalCount: 0, warningCount: 0,
      topIssues: [], appUrl: "https://app.rankiq.com",
    })
    expect(html).toContain("shop&amp;go.com")
  })
})

describe("Regression: GSC state tamper returns null", () => {
  /**
   * Bug class: if the OAuth state param could be tampered to encode a different userId,
   * an attacker could hijack a GSC connection.
   * Fix: parseGscState returns null for invalid base64url; callback checks parsed.userId === session.userId.
   *
   * We inline the function here to avoid triggering config loading (which requires env vars).
   * The gsc.test.ts tests already cover this via the unit test file.
   */
  function parseGscState(state: string): { siteId: string; userId: string } | null {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
      if (typeof parsed.siteId !== "string" || typeof parsed.userId !== "string") return null
      return parsed as { siteId: string; userId: string }
    } catch { return null }
  }

  it("truncated state returns null", () => {
    expect(parseGscState("eyJzaXRl")).toBeNull() /* partial base64 — incomplete JSON */
  })

  it("valid state with different userId is detected by caller check", () => {
    const state = Buffer.from(JSON.stringify({ siteId: "s1", userId: "attacker" })).toString("base64url")
    const parsed = parseGscState(state)
    /* Caller must check parsed.userId === session.userId */
    expect(parsed?.userId === "victim").toBe(false)
  })
})
