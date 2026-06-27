export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit, getHealthSummary } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { PageAnalysis } from "@/domain/audit/types"
import type { AuditIssue } from "@/db/schema"
import { AnimatedScoreRing } from "@/components/ui/AnimatedScoreRing"

export const metadata: Metadata = { title: "Audit Results" }

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) notFound()

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) notFound()

  const [summary, issues] = await Promise.all([
    getHealthSummary(id),
    getIssuesByAudit(id, { limit: 50 }),
  ])

  const pageAnalyses = (audit.pageAnalyses as PageAnalysis[] | null) ?? []
  const sortedPages = [...pageAnalyses].sort((a, b) => a.onPageScore - b.onPageScore).slice(0, 30)

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
            {audit.status === "complete" && (
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
                Download PDF
              </a>
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

      {/* Score + counts row */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "20px", marginBottom: "40px" }}>
        <AnimatedScoreRing score={audit.healthScore ?? 0} size={160} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", alignContent: "start" }}>
          <StatCard label="Critical" value={summary.criticalCount} color="oklch(0.65 0.20 27)" />
          <StatCard label="Warnings" value={summary.warningCount} color="oklch(0.80 0.15 75)" />
          <StatCard label="Info" value={summary.infoCount} color="oklch(0.70 0.12 230)" />
          <StatCard label="Pages crawled" value={audit.pagesCount ?? 0} color="oklch(0.65 0.008 230)" />
          <StatCard label="Issues found" value={summary.totalCount} color="oklch(0.65 0.008 230)" />
          <StatCard label="Avg on-page score" value={pageAnalyses.length > 0 ? Math.round(pageAnalyses.reduce((s, p) => s + p.onPageScore, 0) / pageAnalyses.length) : 0} color="oklch(0.68 0.16 155)" suffix="/100" />
        </div>
      </div>

      {audit.status === "queued" || audit.status === "running" ? (
        <RunningState status={audit.status} />
      ) : (
        <>
          <IssuesSection issues={issues} />
          {sortedPages.length > 0 && <PagesSection pages={sortedPages} />}
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

function StatCard({ label, value, color, suffix = "" }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div style={{ background: "oklch(0.12 0.008 230 / 0.60)", border: "1px solid oklch(0.98 0 0 / 0.06)", borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ fontSize: "22px", fontWeight: 700, color, fontFamily: "var(--font-mono)", letterSpacing: "-0.5px" }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: "11px", color: "oklch(0.38 0.008 230)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>
        {label}
      </div>
    </div>
  )
}

function RunningState({ status }: { status: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "oklch(0.65 0.008 230)" }}>
      <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
      <div style={{ fontSize: "15px", fontWeight: 600, color: "oklch(0.92 0.008 230)", marginBottom: "6px" }}>
        {status === "queued" ? "Audit queued" : "Crawling your site…"}
      </div>
      <div style={{ fontSize: "13px" }}>This usually takes 2–5 minutes. Refresh to check progress.</div>
    </div>
  )
}

function IssuesSection({ issues }: { issues: AuditIssue[] }) {
  if (issues.length === 0) return null
  const severityColor: Record<string, string> = {
    critical: "oklch(0.65 0.20 27)",
    warning:  "oklch(0.80 0.15 75)",
    info:     "oklch(0.70 0.12 230)",
  }
  const severityBg: Record<string, string> = {
    critical: "oklch(0.14 0.07 27)",
    warning:  "oklch(0.14 0.06 75)",
    info:     "oklch(0.14 0.05 230)",
  }

  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.3px", marginBottom: "16px" }}>Issues found</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {issues.map((issue) => (
          <div
            key={issue.id}
            style={{
              background: "oklch(0.12 0.008 230 / 0.60)",
              border: "1px solid oklch(0.98 0 0 / 0.06)",
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
            }}
          >
            <span
              style={{
                padding: "3px 8px",
                background: severityBg[issue.severity],
                color: severityColor[issue.severity],
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                flexShrink: 0,
                marginTop: "2px",
              }}
            >
              {issue.severity}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "oklch(0.92 0.008 230)", marginBottom: "4px" }}>
                {issue.title}
              </div>
              <div style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)", lineHeight: 1.5 }}>
                {issue.description}
              </div>
              {issue.affectedCount > 0 && (
                <div style={{ fontSize: "11px", color: "oklch(0.38 0.008 230)", marginTop: "6px" }}>
                  {issue.affectedCount} page{issue.affectedCount !== 1 ? "s" : ""} affected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PagesSection({ pages }: { pages: PageAnalysis[] }) {
  return (
    <section>
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.3px", marginBottom: "16px" }}>
        Per-page on-page scores
        <span style={{ fontSize: "12px", fontWeight: 400, color: "oklch(0.38 0.008 230)", marginLeft: "8px" }}>lowest first</span>
      </h2>
      <div style={{ background: "oklch(0.12 0.008 230 / 0.60)", border: "1px solid oklch(0.98 0 0 / 0.06)", borderRadius: "10px", overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px 80px", padding: "10px 20px", borderBottom: "1px solid oklch(0.22 0.006 230)" }}>
          {["Score", "URL", "Words", "H1", "H2", "Issues"].map((h) => (
            <div key={h} style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.38 0.008 230)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>
        {pages.map((page, i) => {
          const scoreColor = page.onPageScore >= 80 ? "oklch(0.68 0.16 155)" : page.onPageScore >= 50 ? "oklch(0.80 0.15 75)" : "oklch(0.65 0.20 27)"
          return (
            <div
              key={page.url}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 80px 80px 80px 80px",
                padding: "12px 20px",
                borderBottom: i < pages.length - 1 ? "1px solid oklch(0.22 0.006 230)" : "none",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, color: scoreColor, fontFamily: "var(--font-mono)" }}>
                {page.onPageScore}
              </div>
              <div style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "16px", fontFamily: "var(--font-mono)" }}>
                {page.url.replace(/^https?:\/\//, "")}
              </div>
              <div style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)" }}>{page.wordCount}</div>
              <div style={{ fontSize: "12px", color: page.h1Count === 1 ? "oklch(0.68 0.16 155)" : "oklch(0.65 0.20 27)" }}>{page.h1Count}</div>
              <div style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)" }}>{page.h2Count}</div>
              <div style={{ fontSize: "11px", color: "oklch(0.38 0.008 230)" }}>{page.issueTypes.length}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
