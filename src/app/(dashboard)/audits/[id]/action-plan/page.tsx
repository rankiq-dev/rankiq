export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getAuditById, getIssuesByAudit } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { AuditIssue } from "@/db/schema"
import { MarkFixedButton } from "./MarkFixedButton"

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
  const critical = ranked.filter(i => i.severity === "critical").length
  const warnings = ranked.filter(i => i.severity === "warning").length
  const fixedCount = ranked.filter(i => i.isFixed).length
  const fixPct = ranked.length > 0 ? Math.round((fixedCount / ranked.length) * 100) : 0

  return (
    <div style={{ padding: "32px 40px", maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link href={`/audits/${id}`} style={{ fontSize: "12px", color: "var(--foreground-3)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          ← Audit results
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{
                padding: "3px 10px", borderRadius: "20px",
                background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
                fontSize: "9px", fontWeight: 700, color: "var(--primary-2)",
                textTransform: "uppercase", letterSpacing: "0.12em",
              }}>AI Action Plan</span>
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", marginBottom: "6px", lineHeight: 1.1 }}>
              {site.displayName ?? site.domain}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>
              Issues ranked by estimated revenue impact · {ranked.length} total
            </p>
          </div>
          {audit.status === "complete" && (
            <a href={`/api/v1/audits/${id}/pdf`} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", fontSize: "12px", fontWeight: 600,
              background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-md)", color: "var(--foreground-2)", textDecoration: "none",
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v7M4 6l2.5 2.5L9 6M2 11h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export PDF
            </a>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      {hasActionPlan && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            padding: "16px 20px", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, var(--destructive), transparent)" }} />
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Critical</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--destructive)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{critical}</div>
          </div>
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            padding: "16px 20px", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, var(--warning), transparent)" }} />
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Warnings</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--warning)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{warnings}</div>
          </div>
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            padding: "16px 20px", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, var(--success), transparent)" }} />
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>With AI Fix</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--success)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
              {ranked.filter(i => i.fixInstructions).length}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {fixedCount > 0 && (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "16px 20px", marginBottom: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Fix Progress
            </div>
            <span style={{ fontSize: "12px", color: "var(--success)", fontWeight: 700 }}>
              {fixedCount} / {ranked.length} issues fixed ({fixPct}%)
            </span>
          </div>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${fixPct}%`, background: "linear-gradient(90deg, var(--primary), var(--success))", borderRadius: "2px", transition: "width 0.5s ease-out" }} />
          </div>
        </div>
      )}

      {!hasActionPlan ? (
        <PendingState auditStatus={audit.status} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "64px 40px", textAlign: "center",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "14px",
        background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", boxShadow: "0 0 24px var(--primary-glow)",
        fontSize: "24px",
      }}>
        {isReady ? "⚙" : "⏳"}
      </div>
      <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--foreground)", marginBottom: "10px", letterSpacing: "-0.3px" }}>
        {isReady ? "Generating action plan…" : "Waiting for audit to complete"}
      </div>
      <div style={{ fontSize: "13px", color: "var(--foreground-2)", maxWidth: "360px", margin: "0 auto", lineHeight: 1.7 }}>
        {isReady
          ? "Claude AI is ranking your issues by revenue impact and writing plain-English fix instructions. This takes 15–30 seconds — refresh the page shortly."
          : "The audit must finish before the action plan can run. Check back in a moment."}
      </div>
    </div>
  )
}

const FIX_TIME: Record<string, string> = {
  missing_title: "5 min", short_title: "5 min", long_title: "5 min",
  missing_meta_description: "10 min", missing_h1: "10 min", multiple_h1: "15 min",
  missing_canonical: "15 min", missing_image_alt: "30 min", thin_content: "2 hrs",
  broken_link: "30 min", redirect_chain: "1 hr", orphan_page: "45 min",
  missing_schema: "1 hr", no_schema: "1 hr", duplicate_title: "30 min",
  duplicate_meta_description: "30 min", page_not_found: "30 min",
  slow_page: "2 hrs", missing_sitemap: "30 min",
}

function getFixTime(type: string): string {
  return FIX_TIME[type] ?? "1 hr"
}

function ActionCard({ issue, rank }: { issue: AuditIssue; rank: number }) {
  const sevColor: Record<string, string> = {
    critical: "var(--destructive)", warning: "var(--warning)", info: "var(--info)",
  }
  const sevBg: Record<string, string> = {
    critical: "var(--destructive-bg)", warning: "var(--warning-bg)", info: "var(--info-bg)",
  }
  const sevBorder: Record<string, string> = {
    critical: "oklch(0.65 0.20 27 / 0.3)", warning: "oklch(0.80 0.15 75 / 0.3)", info: "oklch(0.70 0.12 230 / 0.3)",
  }
  const sc = sevColor[issue.severity] ?? "var(--foreground-2)"
  const sb = sevBg[issue.severity] ?? "var(--glass-bg)"
  const sborder = sevBorder[issue.severity] ?? "var(--glass-border)"

  const isTop3 = rank <= 3

  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: `1px solid ${isTop3 ? "oklch(0.55 0.13 178 / 0.25)" : "var(--glass-border)"}`,
      borderRadius: "var(--radius-xl)",
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "52px 1fr",
      gap: "16px",
      alignItems: "start",
      position: "relative",
      overflow: "hidden",
    }}>
      {isTop3 && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, var(--primary), var(--primary-2), transparent)",
        }} />
      )}

      {/* Rank badge */}
      <div style={{
        width: "52px", height: "52px", borderRadius: "12px",
        background: isTop3
          ? "linear-gradient(135deg, var(--primary), var(--primary-2))"
          : "oklch(0.18 0.006 230)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
        boxShadow: isTop3 ? "0 0 16px var(--primary-glow)" : "none",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "7px", fontWeight: 700, color: isTop3 ? "oklch(0.98 0.005 230 / 0.7)" : "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          #{rank}
        </span>
        <span style={{ fontSize: "18px", fontWeight: 800, color: isTop3 ? "oklch(0.98 0.005 230)" : "var(--foreground-3)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
          {rank}
        </span>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.2px" }}>
            {issue.title}
          </span>
          <span style={{
            padding: "2px 8px", background: sb, color: sc,
            border: `1px solid ${sborder}`,
            borderRadius: "4px", fontSize: "9px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {issue.severity}
          </span>
          <MarkFixedButton issueId={issue.id} isFixed={issue.isFixed} />
        </div>

        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.65, marginBottom: "10px" }}>
          {issue.description}
        </p>

        {issue.fixInstructions && (
          <div style={{
            background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.2)",
            borderLeft: "3px solid var(--primary)", borderRadius: "8px",
            padding: "12px 16px", marginBottom: "10px",
          }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
              ✦ AI Fix Instructions
            </div>
            <p style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.65, margin: 0 }}>
              {issue.fixInstructions}
            </p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "var(--foreground-3)", marginBottom: "8px" }}>
          <span>{issue.affectedCount} page{issue.affectedCount !== 1 ? "s" : ""} affected</span>
          <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--border-strong)", display: "inline-block" }} />
          <span>{issue.category.replace(/_/g, " ")}</span>
          <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--border-strong)", display: "inline-block" }} />
          <span style={{ color: "var(--info)" }}>⏱ {getFixTime(issue.type)}</span>
          {issue.revenueImpactRank != null && (
            <>
              <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--border-strong)", display: "inline-block" }} />
              <span style={{ color: "var(--primary-2)" }}>Revenue impact #{issue.revenueImpactRank}</span>
            </>
          )}
        </div>
        {(issue.affectedUrls as string[] | null) && (issue.affectedUrls as string[]).length > 0 && (
          <div style={{ marginTop: "4px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>
              Affected URLs
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {(issue.affectedUrls as string[]).slice(0, 5).map(url => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--primary-2)",
                  textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: "100%", display: "block",
                }}>{url}</a>
              ))}
              {(issue.affectedUrls as string[]).length > 5 && (
                <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>
                  +{(issue.affectedUrls as string[]).length - 5} more…
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
