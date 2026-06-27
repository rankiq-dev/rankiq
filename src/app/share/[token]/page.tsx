import { db } from "@/db"
import { audits, sites } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getIssuesByAudit } from "@/db/repositories/audits"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const audit = await db.query.audits.findFirst({ where: eq(audits.shareToken, token) })
  if (!audit) return { title: "Shared Report" }
  const site = await db.query.sites.findFirst({ where: eq(sites.id, audit.siteId) })
  return { title: `SEO Report – ${site?.displayName ?? site?.domain ?? "Site"}` }
}

export default async function SharedAuditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const audit = await db.query.audits.findFirst({ where: eq(audits.shareToken, token) })
  if (!audit || audit.status !== "complete") notFound()

  const site = await db.query.sites.findFirst({ where: eq(sites.id, audit.siteId) })
  if (!site) notFound()

  const issues = await getIssuesByAudit(audit.id, { limit: 100 })

  const score = audit.healthScore ?? 0
  const scoreColor = score >= 90 ? "oklch(0.65 0.15 145)" : score >= 70 ? "oklch(0.65 0.13 196)" : score >= 50 ? "oklch(0.75 0.15 75)" : "oklch(0.65 0.20 27)"
  const critical = issues.filter(i => i.severity === "critical").length
  const warnings = issues.filter(i => i.severity === "warning").length

  return (
    <div style={{
      minHeight: "100vh",
      background: "oklch(0.10 0.008 230)",
      color: "oklch(0.92 0.008 230)",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: "0 0 60px",
    }}>
      {/* Navbar */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: "56px",
        borderBottom: "1px solid oklch(0.20 0.008 230)",
        background: "oklch(0.12 0.008 230 / 0.9)",
        backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 1L19 10L10 19L1 10L10 1Z" stroke="oklch(0.65 0.13 196)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M10 5L15 10L10 15L5 10L10 5Z" fill="oklch(0.55 0.13 178)" fillOpacity="0.5"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "-0.3px", color: "oklch(0.92 0.008 230)" }}>RankIQ</span>
          <span style={{ fontSize: "11px", color: "oklch(0.50 0.008 230)", margin: "0 4px" }}>·</span>
          <span style={{ fontSize: "12px", color: "oklch(0.60 0.008 230)" }}>Shared Report</span>
        </div>
        <Link href="/" style={{
          padding: "6px 14px", fontSize: "11px", fontWeight: 700,
          background: "oklch(0.55 0.13 178)", color: "oklch(0.98 0.008 230)",
          borderRadius: "6px", textDecoration: "none",
        }}>Try RankIQ free</Link>
      </header>

      <div style={{ padding: "40px 40px 0", maxWidth: "900px", margin: "0 auto" }}>

        {/* Site + Score */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "36px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" }}>
              {site.displayName ?? site.domain}
            </h1>
            <p style={{ fontSize: "12px", color: "oklch(0.55 0.008 230)", fontFamily: "monospace" }}>{site.domain}</p>
            <p style={{ fontSize: "11px", color: "oklch(0.45 0.008 230)", marginTop: "8px" }}>
              Audited {audit.completedAt ? new Date(audit.completedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "recently"} · {audit.pagesCount} pages
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "52px", fontWeight: 900, color: scoreColor, lineHeight: 1, fontFamily: "monospace", letterSpacing: "-2px" }}>
              {score}
            </div>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "oklch(0.50 0.008 230)", marginTop: "4px" }}>
              Health Score
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "32px" }}>
          {[
            { label: "Critical Issues", value: critical, color: "oklch(0.65 0.20 27)" },
            { label: "Warnings", value: warnings, color: "oklch(0.75 0.15 75)" },
            { label: "Total Issues", value: issues.length, color: "oklch(0.65 0.13 196)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "oklch(0.13 0.008 230)", border: "1px solid oklch(0.20 0.008 230)",
              borderRadius: "12px", padding: "16px 20px",
            }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
              <div style={{ fontSize: "11px", color: "oklch(0.50 0.008 230)", marginTop: "4px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Issues table */}
        <div style={{ background: "oklch(0.13 0.008 230)", border: "1px solid oklch(0.20 0.008 230)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid oklch(0.18 0.008 230)" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700 }}>Issues Found</h2>
          </div>
          {issues.slice(0, 50).map(issue => {
            const sev = issue.severity
            const bg = sev === "critical" ? "oklch(0.65 0.20 27)" : sev === "warning" ? "oklch(0.75 0.15 75)" : sev === "error" ? "oklch(0.65 0.20 27)" : "oklch(0.55 0.12 220)"
            return (
              <div key={issue.id} style={{
                display: "grid", gridTemplateColumns: "80px 1fr 80px",
                padding: "12px 20px", borderBottom: "1px solid oklch(0.17 0.008 230)",
                gap: "12px", alignItems: "center",
              }}>
                <span style={{
                  display: "inline-flex", padding: "2px 8px", borderRadius: "4px",
                  background: `${bg}22`, color: bg,
                  fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                  width: "fit-content",
                }}>{sev}</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{issue.title}</div>
                  <div style={{ fontSize: "11px", color: "oklch(0.50 0.008 230)", marginTop: "2px" }}>{issue.description}</div>
                </div>
                <span style={{ fontSize: "11px", color: "oklch(0.50 0.008 230)", textAlign: "right" }}>
                  {issue.affectedCount} pg
                </span>
              </div>
            )
          })}
          {issues.length > 50 && (
            <div style={{ padding: "12px 20px", fontSize: "11px", color: "oklch(0.45 0.008 230)" }}>
              +{issues.length - 50} more issues · Get full report on RankIQ
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "12px 28px", fontSize: "13px", fontWeight: 700,
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            color: "oklch(0.98 0.008 230)", borderRadius: "8px", textDecoration: "none",
          }}>
            Fix these issues with RankIQ →
          </Link>
          <p style={{ fontSize: "11px", color: "oklch(0.40 0.008 230)", marginTop: "10px" }}>
            Free to try · No credit card required
          </p>
        </div>
      </div>
    </div>
  )
}
