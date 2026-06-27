export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { AuditIssue } from "@/db/schema"

export const metadata: Metadata = { title: "Action Plan" }

export default async function ActionPlanPage({
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

  const issues = await getIssuesByAudit(id, { limit: 20 })
  const ranked = [...issues].sort((a, b) => {
    if (a.revenueImpactRank == null && b.revenueImpactRank == null) return 0
    if (a.revenueImpactRank == null) return 1
    if (b.revenueImpactRank == null) return -1
    return a.revenueImpactRank - b.revenueImpactRank
  })

  const hasActionPlan = ranked.some((i) => i.fixInstructions != null)

  return (
    <div style={{ padding: "32px 40px", maxWidth: "860px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link href={`/audits/${id}`} style={{ fontSize: "12px", color: "oklch(0.38 0.008 230)", textDecoration: "none" }}>
          ← Audit results
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.5px", marginTop: "8px", marginBottom: "4px" }}>
          AI Action Plan
        </h1>
        <p style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)" }}>
          {site.displayName ?? site.domain} · Issues ranked by estimated revenue impact
        </p>
      </div>

      {!hasActionPlan ? (
        <PendingState auditStatus={audit.status} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {ranked.map((issue, idx) => (
            <ActionCard key={issue.id} issue={issue} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function PendingState({ auditStatus }: { auditStatus: string }) {
  const isReady = auditStatus === "complete"
  return (
    <div style={{
      background: "oklch(0.12 0.008 230 / 0.60)",
      border: "1px solid oklch(0.98 0 0 / 0.06)",
      borderRadius: "14px",
      padding: "48px 32px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "32px", marginBottom: "16px" }}>{isReady ? "⚙️" : "⏳"}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: "oklch(0.92 0.008 230)", marginBottom: "8px" }}>
        {isReady ? "Action plan is being generated…" : "Waiting for audit to complete"}
      </div>
      <div style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)", maxWidth: "360px", margin: "0 auto", lineHeight: 1.6 }}>
        {isReady
          ? "The AI is ranking your issues and writing plain-English fix instructions. This takes about 15–30 seconds."
          : "The audit must complete before the action plan can run. Check back shortly."}
      </div>
    </div>
  )
}

function ActionCard({ issue, rank }: { issue: AuditIssue; rank: number }) {
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
  const sc = severityColor[issue.severity] ?? "oklch(0.65 0.008 230)"
  const sb = severityBg[issue.severity] ?? "oklch(0.13 0.008 230)"

  return (
    <div style={{
      background: "oklch(0.12 0.008 230 / 0.60)",
      border: "1px solid oklch(0.98 0 0 / 0.06)",
      borderRadius: "12px",
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "44px 1fr",
      gap: "16px",
      alignItems: "start",
    }}>
      {/* Rank badge */}
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "10px",
        background: rank <= 3
          ? "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))"
          : "oklch(0.18 0.006 230)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        fontWeight: 800,
        color: rank <= 3 ? "oklch(0.98 0.005 230)" : "oklch(0.38 0.008 230)",
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
      }}>
        #{rank}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "oklch(0.92 0.008 230)" }}>
            {issue.title}
          </span>
          <span style={{
            padding: "2px 7px",
            background: sb,
            color: sc,
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {issue.severity}
          </span>
          {issue.isFixed && (
            <span style={{ padding: "2px 7px", background: "oklch(0.14 0.07 155)", color: "oklch(0.68 0.16 155)", borderRadius: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em" }}>
              FIXED
            </span>
          )}
        </div>

        <p style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)", lineHeight: 1.6, marginBottom: "10px" }}>
          {issue.description}
        </p>

        {issue.fixInstructions && (
          <div style={{
            background: "oklch(0.18 0.06 178 / 0.35)",
            border: "1px solid oklch(0.55 0.13 178 / 0.2)",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "10px",
          }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.65 0.13 178)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
              ✦ How to fix
            </div>
            <p style={{ fontSize: "13px", color: "oklch(0.85 0.008 230)", lineHeight: 1.6 }}>
              {issue.fixInstructions}
            </p>
          </div>
        )}

        <div style={{ fontSize: "11px", color: "oklch(0.38 0.008 230)" }}>
          {issue.affectedCount} page{issue.affectedCount !== 1 ? "s" : ""} affected · {issue.category.replace("_", " ")}
        </div>
      </div>
    </div>
  )
}
