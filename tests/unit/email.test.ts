import { describe, it, expect } from "vitest"
import { auditReportEmail, welcomeEmail } from "@/domain/email/templates"

describe("Email templates", () => {
  describe("auditReportEmail", () => {
    const base = {
      recipientName:  "Alice",
      domain:         "example.com",
      auditId:        "audit-uuid-1",
      healthScore:    74,
      prevHealthScore: 60,
      pagesCount:     42,
      criticalCount:  3,
      warningCount:   8,
      topIssues:      [
        { title: "Missing title tags", severity: "critical", affectedCount: 12 },
        { title: "Duplicate meta descriptions", severity: "warning", affectedCount: 5 },
      ],
      appUrl: "https://app.rankiq.com",
    }

    it("produces the correct subject line", () => {
      const { subject } = auditReportEmail(base)
      expect(subject).toContain("example.com")
      expect(subject).toContain("74")
    })

    it("HTML includes the domain", () => {
      const { html } = auditReportEmail(base)
      expect(html).toContain("example.com")
    })

    it("HTML includes the health score", () => {
      const { html } = auditReportEmail(base)
      expect(html).toContain("74")
    })

    it("shows positive trend when score improved", () => {
      const { html } = auditReportEmail(base)
      expect(html).toContain("+14")
    })

    it("shows negative trend when score dropped", () => {
      const { html } = auditReportEmail({ ...base, healthScore: 50, prevHealthScore: 60 })
      expect(html).toContain("-10")
    })

    it("shows no trend when no previous score", () => {
      const { html } = auditReportEmail({ ...base, prevHealthScore: null })
      expect(html).not.toContain("from last audit")
    })

    it("includes issue titles in the body", () => {
      const { html } = auditReportEmail(base)
      expect(html).toContain("Missing title tags")
    })

    it("includes the CTA link pointing to the audit", () => {
      const { html } = auditReportEmail(base)
      expect(html).toContain("https://app.rankiq.com/audits/audit-uuid-1")
    })

    it("HTML-escapes the domain to prevent XSS", () => {
      const { html } = auditReportEmail({ ...base, domain: '<script>alert(1)</script>' })
      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })

    it("HTML-escapes issue titles to prevent XSS", () => {
      const { html } = auditReportEmail({
        ...base,
        topIssues: [{ title: '<img src=x onerror=alert(1)>', severity: "critical", affectedCount: 1 }],
      })
      expect(html).not.toContain("<img src=x")
      expect(html).toContain("&lt;img")
    })

    it("limits displayed issues to 5", () => {
      const manyIssues = Array.from({ length: 10 }, (_, i) => ({
        title: `Issue ${i}`,
        severity: "warning",
        affectedCount: i + 1,
      }))
      const { html } = auditReportEmail({ ...base, topIssues: manyIssues })
      /* Only first 5 should appear */
      expect(html).toContain("Issue 4")
      expect(html).not.toContain("Issue 5")
    })
  })

  describe("welcomeEmail", () => {
    it("produces a subject with RankIQ branding", () => {
      const { subject } = welcomeEmail({ recipientName: "Bob", appUrl: "https://app.rankiq.com" })
      expect(subject.toLowerCase()).toContain("rankiq")
    })

    it("HTML includes the CTA link to /sites/new", () => {
      const { html } = welcomeEmail({ recipientName: null, appUrl: "https://app.rankiq.com" })
      expect(html).toContain("https://app.rankiq.com/sites/new")
    })

    it("uses generic greeting when no name provided", () => {
      const { html } = welcomeEmail({ recipientName: null, appUrl: "https://app.rankiq.com" })
      expect(html).toContain("Hi there,")
    })

    it("personalises greeting when name provided", () => {
      const { html } = welcomeEmail({ recipientName: "Charlie", appUrl: "https://app.rankiq.com" })
      expect(html).toContain("Hi Charlie,")
    })

    it("HTML-escapes the recipient name", () => {
      const { html } = welcomeEmail({ recipientName: '<script>evil</script>', appUrl: "https://app.rankiq.com" })
      expect(html).not.toContain("<script>")
    })
  })
})
