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
import { AuditProgress } from "./AuditProgress"
import { RerunButton } from "./RerunButton"
import { ShareButton } from "./ShareButton"
import { ExpandableIssue } from "./ExpandableIssue"
import { BulkFixButton } from "./BulkFixButton"

export const metadata: Metadata = { title: "Audit Results" }

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sev?: string; cat?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const sp = await searchParams
  const sevFilter = sp.sev ?? null
  const catFilter = sp.cat ?? null
  const audit = await getAuditById(id)
  if (!audit) notFound()

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) notFound()

  const [summary, issues] = await Promise.all([
    getHealthSummary(id),
    getIssuesByAudit(id, { limit: 200 }),
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
            {audit.status === "complete" && <RerunButton siteId={audit.siteId} />}
            {audit.status === "complete" && <ShareButton auditId={id} initialToken={audit.shareToken ?? null} />}
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

      {/* Category breakdown */}
      {audit.status === "complete" && issues.length > 0 && (
        <CategoryBreakdown issues={issues} auditId={id} />
      )}

      {audit.status === "queued" || audit.status === "running" ? (
        <RunningState status={audit.status} />
      ) : (
        <>
          <IssuesSection issues={issues} auditId={id} sevFilter={sevFilter} catFilter={catFilter} />
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
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: "24px", fontWeight: 800, color, fontFamily: "var(--font-mono)", letterSpacing: "-0.5px", filter: `drop-shadow(0 0 6px ${color}80)` }}>
        {value}{suffix}
      </div>
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

function IssuesSection({ issues, auditId, sevFilter, catFilter }: { issues: AuditIssue[]; auditId: string; sevFilter: string | null; catFilter: string | null }) {
  if (issues.length === 0) return null

  const filtered = issues.filter(i =>
    (!sevFilter || i.severity === sevFilter) &&
    (!catFilter || i.category === catFilter)
  )

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

  return (
    <section style={{ marginBottom: "36px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Issues Found
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{filtered.length} of {issues.length}</span>
          <BulkFixButton auditId={auditId} totalCount={issues.length} fixedCount={issues.filter(i => i.isFixed).length} />
        </div>
      </div>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        <Link href={`/audits/${auditId}`} style={{
          padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
          textDecoration: "none",
          background: !sevFilter && !catFilter ? "var(--primary-soft)" : "transparent",
          color: !sevFilter && !catFilter ? "var(--primary-2)" : "var(--foreground-3)",
          border: !sevFilter && !catFilter ? "1px solid oklch(0.55 0.13 178 / 0.3)" : "1px solid var(--glass-border)",
        }}>All</Link>
        {severities.filter(s => issues.some(i => i.severity === s)).map(s => (
          <Link key={s} href={`/audits/${auditId}?sev=${s}`} style={{
            padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
            textDecoration: "none", textTransform: "capitalize",
            background: sevFilter === s ? "var(--primary-soft)" : "transparent",
            color: sevFilter === s ? "var(--primary-2)" : "var(--foreground-3)",
            border: sevFilter === s ? "1px solid oklch(0.55 0.13 178 / 0.3)" : "1px solid var(--glass-border)",
          }}>{s}</Link>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {groups.map(group => group.items.map((issue) => (
          <ExpandableIssue
            key={issue.id}
            title={issue.title}
            description={issue.description}
            severity={issue.severity}
            category={issue.category}
            affectedCount={issue.affectedCount}
            affectedUrls={(issue.affectedUrls as string[] | null) ?? undefined}
            fixInstructions={issue.fixInstructions}
            isFixed={issue.isFixed}
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
