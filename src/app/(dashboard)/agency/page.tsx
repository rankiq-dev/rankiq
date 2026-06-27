export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { BulkAuditButton } from "./BulkAuditButton"

export const metadata: Metadata = { title: "Agency Dashboard" }

export default async function AgencyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const sites = await getSitesByUser(session.user.id)

  const siteData = await Promise.all(
    sites.map(async (site) => {
      const audit = await getLatestAuditForSite(site.id)
      const issues = audit ? await getIssuesByAudit(audit.id, { limit: 100 }) : []
      const criticalCount = issues.filter(i => i.severity === "critical").length
      const warningCount = issues.filter(i => i.severity === "warning").length
      return { site, audit, criticalCount, warningCount, issueCount: issues.length }
    })
  )

  const totalSites = sites.length
  const healthySites = siteData.filter(d => (d.audit?.healthScore ?? 0) >= 90).length
  const criticalSites = siteData.filter(d => d.criticalCount > 0).length
  const avgHealth = siteData.length > 0
    ? Math.round(siteData.reduce((sum, d) => sum + (d.audit?.healthScore ?? 0), 0) / siteData.length)
    : 0

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1200px", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{
            padding: "4px 10px", borderRadius: "20px",
            background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
            fontSize: "10px", fontWeight: 700, color: "var(--primary-2)",
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>Agency</div>
          <div style={{ fontSize: "10px", color: "var(--foreground-3)", fontWeight: 500 }}>
            {totalSites} site{totalSites !== 1 ? "s" : ""} under management
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-1px", marginBottom: "6px", lineHeight: 1.1 }}>
              Portfolio Overview
            </h1>
            <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.6 }}>
              Real-time SEO health across all your client sites.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {totalSites >= 2 && (
              <Link href="/agency/compare" style={{
                padding: "9px 16px", fontSize: "12px", fontWeight: 600,
                background: "var(--glass-bg)", color: "var(--foreground-2)",
                border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                textDecoration: "none",
              }}>⇔ Compare</Link>
            )}
            {totalSites > 0 && <BulkAuditButton siteCount={totalSites} />}
            <Link href="/sites/new" style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
              color: "var(--primary-foreground)",
              borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 700,
              textDecoration: "none", letterSpacing: "0.02em",
              boxShadow: "var(--shadow-glow)",
            }}>
              + Add Client Site
            </Link>
          </div>
        </div>
      </div>

      {/* Portfolio KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
        <KpiCard label="Portfolio Health" value={`${avgHealth}`} unit="/100" color="var(--primary-2)"
          glow="var(--primary-glow)" icon={<HealthIcon />} />
        <KpiCard label="Healthy Sites" value={`${healthySites}`} unit={`/ ${totalSites}`} color="var(--success)"
          glow="oklch(0.68 0.16 155 / 0.35)" icon={<CheckIcon />} />
        <KpiCard label="Needs Attention" value={`${criticalSites}`} unit="critical" color="var(--destructive)"
          glow="oklch(0.65 0.20 27 / 0.35)" icon={<AlertIcon />} />
        <KpiCard label="Total Issues" value={`${siteData.reduce((s, d) => s + d.issueCount, 0)}`} unit="across all"
          color="var(--warning)" glow="oklch(0.80 0.15 75 / 0.35)" icon={<IssueIcon />} />
      </div>

      {/* Health Distribution Bar */}
      {totalSites > 0 && (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "20px 24px", marginBottom: "24px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
            Health Distribution
          </div>
          <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", gap: "2px" }}>
            {[
              { label: "90–100", count: siteData.filter(d => (d.audit?.healthScore ?? 0) >= 90).length, color: "var(--success)" },
              { label: "70–89", count: siteData.filter(d => { const s = d.audit?.healthScore ?? 0; return s >= 70 && s < 90 }).length, color: "var(--primary)" },
              { label: "50–69", count: siteData.filter(d => { const s = d.audit?.healthScore ?? 0; return s >= 50 && s < 70 }).length, color: "var(--warning)" },
              { label: "0–49", count: siteData.filter(d => (d.audit?.healthScore ?? 0) < 50 && d.audit).length, color: "var(--destructive)" },
              { label: "No audit", count: siteData.filter(d => !d.audit).length, color: "var(--border-strong)" },
            ].map(seg => seg.count > 0 && (
              <div key={seg.label} style={{ flex: seg.count, background: seg.color, minWidth: "4px", borderRadius: "2px" }} title={`${seg.label}: ${seg.count} site${seg.count !== 1 ? "s" : ""}`} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
            {[
              { label: "Excellent (90+)", color: "var(--success)" },
              { label: "Good (70–89)", color: "var(--primary)" },
              { label: "Fair (50–69)", color: "var(--warning)" },
              { label: "Poor (<50)", color: "var(--destructive)" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--foreground-3)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: l.color, flexShrink: 0 }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sites Table */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Client Sites
          </div>
          <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{totalSites} total</div>
        </div>

        {siteData.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◎</div>
            <div style={{ fontSize: "14px", color: "var(--foreground-3)", marginBottom: "16px" }}>No client sites yet</div>
            <Link href="/sites/new" style={{
              padding: "9px 18px", background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
              color: "var(--primary-2)", borderRadius: "var(--radius-md)", fontSize: "13px",
              fontWeight: 600, textDecoration: "none",
            }}>Add your first site →</Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Site", "Health", "Status", "Critical", "Warnings", "Last Audit", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", fontSize: "10px", fontWeight: 700,
                    color: "var(--foreground-3)", textAlign: h === "Site" ? "left" : "center",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    borderBottom: "1px solid var(--glass-border)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siteData.map(({ site, audit, criticalCount, warningCount }, i) => {
                const score = audit?.healthScore ?? null
                const scoreColor = score === null ? "var(--foreground-3)"
                  : score >= 90 ? "var(--success)"
                  : score >= 70 ? "var(--primary-2)"
                  : score >= 50 ? "var(--warning)"
                  : "var(--destructive)"

                return (
                  <tr key={site.id} style={{
                    borderBottom: i < siteData.length - 1 ? "1px solid var(--glass-border)" : "none",
                    transition: "background 150ms",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "oklch(0.98 0 0 / 0.02)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
                          {site.displayName ?? site.domain}
                        </span>
                        {site.clientLabel && (
                          <span style={{
                            padding: "1px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700,
                            background: "var(--primary-soft)", color: "var(--primary-2)",
                            border: "1px solid oklch(0.55 0.13 178 / 0.25)", whiteSpace: "nowrap",
                          }}>{site.clientLabel}</span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>
                        {site.domain}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      {score !== null ? (
                        <div style={{
                          fontSize: "20px", fontWeight: 800, color: scoreColor,
                          fontFamily: "var(--font-mono)",
                          filter: `drop-shadow(0 0 6px ${scoreColor})`,
                        }}>{score}</div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--foreground-3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <StatusPill status={audit?.status ?? "none"} />
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      {criticalCount > 0 ? (
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--destructive)" }}>{criticalCount}</span>
                      ) : (
                        <span style={{ fontSize: "13px", color: "var(--foreground-3)" }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      {warningCount > 0 ? (
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--warning)" }}>{warningCount}</span>
                      ) : (
                        <span style={{ fontSize: "13px", color: "var(--foreground-3)" }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>
                        {audit?.completedAt ? new Date(audit.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Never"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <Link href={`/sites/${site.id}`} style={{
                          padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                          background: "var(--primary-soft)", color: "var(--primary-2)",
                          borderRadius: "var(--radius)", textDecoration: "none",
                          border: "1px solid oklch(0.55 0.13 178 / 0.3)",
                        }}>View</Link>
                        {audit && (
                          <Link href={`/audits/${audit.id}`} style={{
                            padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                            background: "oklch(0.98 0 0 / 0.04)", color: "var(--foreground-2)",
                            borderRadius: "var(--radius)", textDecoration: "none",
                            border: "1px solid var(--glass-border)",
                          }}>Audit</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Priority Issues across all sites */}
      {siteData.some(d => d.criticalCount > 0) && (
        <div style={{
          marginTop: "24px",
          background: "oklch(0.14 0.07 27 / 0.3)", backdropFilter: "blur(20px)",
          border: "1px solid oklch(0.55 0.20 27 / 0.2)", borderRadius: "var(--radius-xl)",
          padding: "20px 24px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            ⚠ Sites Needing Immediate Attention
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {siteData.filter(d => d.criticalCount > 0).map(({ site, audit, criticalCount }) => (
              <div key={site.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{site.displayName ?? site.domain}</span>
                  <span style={{ fontSize: "11px", color: "var(--destructive)", marginLeft: "10px" }}>{criticalCount} critical issue{criticalCount !== 1 ? "s" : ""}</span>
                </div>
                {audit && (
                  <Link href={`/audits/${audit.id}`} style={{
                    padding: "5px 12px", fontSize: "11px", fontWeight: 700,
                    background: "var(--destructive-bg)", color: "var(--destructive)",
                    borderRadius: "var(--radius)", textDecoration: "none",
                    border: "1px solid oklch(0.65 0.20 27 / 0.3)",
                  }}>Fix Now →</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, unit, color, glow, icon }: {
  label: string; value: string; unit: string; color: string; glow: string; icon: React.ReactNode
}) {
  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "20px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
        <div style={{ color, opacity: 0.7 }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span style={{ fontSize: "32px", fontWeight: 800, color, fontFamily: "var(--font-mono)", filter: `drop-shadow(0 0 8px ${glow})`, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: "11px", color: "var(--foreground-3)", fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const config = {
    complete: { label: "Complete", bg: "var(--success-bg)", color: "var(--success)", border: "oklch(0.68 0.16 155 / 0.3)" },
    running: { label: "Running", bg: "var(--primary-soft)", color: "var(--primary-2)", border: "oklch(0.55 0.13 178 / 0.3)" },
    queued: { label: "Queued", bg: "var(--info-bg)", color: "var(--info)", border: "oklch(0.70 0.12 230 / 0.3)" },
    failed: { label: "Failed", bg: "var(--destructive-bg)", color: "var(--destructive)", border: "oklch(0.65 0.20 27 / 0.3)" },
    none: { label: "No Audit", bg: "oklch(0.18 0.006 230)", color: "var(--foreground-3)", border: "var(--glass-border)" },
  }[status] ?? { label: status, bg: "oklch(0.18 0.006 230)", color: "var(--foreground-3)", border: "var(--glass-border)" }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 8px", borderRadius: "20px",
      background: config.bg, color: config.color,
      border: `1px solid ${config.border}`,
      fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: config.color, flexShrink: 0 }} />
      {config.label}
    </span>
  )
}

function HealthIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 10a4 4 0 110-8 4 4 0 010 8z" fill="currentColor"/><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
}
function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function AlertIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function IssueIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
}
