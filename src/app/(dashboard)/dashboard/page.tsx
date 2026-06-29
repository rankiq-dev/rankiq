export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getUserById } from "@/db/repositories/users"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit, getAuditsForSite } from "@/db/repositories/audits"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { Site, Audit } from "@/db/schema"
import { WhatsNew } from "./WhatsNew"
import { SiteFilter } from "./SiteFilter"
import { OnboardingChecklist } from "./OnboardingChecklist"
import { PLAN_LIMITS } from "@/lib/constants"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [user, sites] = await Promise.all([
    getUserById(session.user.id),
    getSitesByUser(session.user.id),
  ])
  const latestAudits = sites.length > 0
    ? await Promise.all(sites.map((s) => getLatestAuditForSite(s.id)))
    : []

  if (!user) redirect("/login")

  const avgHealth = latestAudits.filter(a => a?.healthScore != null).length > 0
    ? Math.round(latestAudits.filter(a => a?.healthScore != null).reduce((s, a) => s + (a?.healthScore ?? 0), 0) / latestAudits.filter(a => a?.healthScore != null).length)
    : null

  const completedAudits = latestAudits.filter(a => a?.status === "complete").length
  const runningAudits = latestAudits.filter(a => a?.status === "running" || a?.status === "queued").length

  // Count total critical issues across all sites
  const totalCritical = latestAudits.reduce((sum, a) => {
    return sum + (a?.healthScore != null && a.healthScore < 60 ? 1 : 0)
  }, 0)

  const totalPagesCrawled = latestAudits.reduce((sum, a) => sum + (a?.pagesCount ?? 0), 0)

  // Sites not audited in 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const staleSites = sites.filter((site, i) => {
    const audit = latestAudits[i]
    if (!audit) return true
    const lastAuditDate = audit.completedAt ?? audit.createdAt
    return lastAuditDate == null || new Date(lastAuditDate) < thirtyDaysAgo
  })

  // Fetch top unfixed critical issues across all complete audits
  const completeAuditsWithSite = latestAudits
    .map((a, i) => ({ audit: a, site: sites[i]! }))
    .filter(x => x.audit?.status === "complete")
  const auditIssuesRaw = await Promise.all(
    completeAuditsWithSite.map(async ({ audit, site }) => {
      const issues = await getIssuesByAudit(audit!.id, { limit: 300 })
      return { audit: audit!, site, issues }
    })
  )
  const allCriticalIssues = auditIssuesRaw.flatMap(({ audit, site, issues }) =>
    issues.filter(i => i.severity === "critical" && !i.isFixed)
      .slice(0, 3)
      .map(i => ({ ...i, siteId: site.id, siteDomain: site.displayName ?? site.domain, auditId: audit.id }))
  ).slice(0, 6)
  const totalOpenIssues = auditIssuesRaw.reduce((s, { issues }) => s + issues.filter(i => !i.isFixed).length, 0)

  // Recently fixed issues across all sites (reuse auditIssuesRaw)
  const recentlyFixed = auditIssuesRaw.flatMap(({ audit, site, issues }) =>
    issues.filter(i => i.isFixed && i.fixedAt != null)
      .sort((a, b) => new Date(b.fixedAt!).getTime() - new Date(a.fixedAt!).getTime())
      .slice(0, 2)
      .map(i => ({ ...i, siteDomain: site.displayName ?? site.domain, auditId: audit.id }))
  ).sort((a, b) => new Date(b.fixedAt!).getTime() - new Date(a.fixedAt!).getTime()).slice(0, 5)

  // Improvement streak: count of consecutive score improvements across the most active site
  const mostActiveSiteIdx = latestAudits.reduce((best, a, i) => {
    const bAudit = latestAudits[best]
    return (a?.pagesCount ?? 0) > (bAudit?.pagesCount ?? 0) ? i : best
  }, 0)
  const streakSiteId = sites[mostActiveSiteIdx]?.id
  let improvementStreak = 0
  if (streakSiteId) {
    const siteAuditHistory = await getAuditsForSite(streakSiteId, 10)
    const completed = siteAuditHistory.filter(a => a.status === "complete" && a.healthScore != null)
    for (let i = 0; i + 1 < completed.length; i++) {
      if ((completed[i]!.healthScore ?? 0) >= (completed[i + 1]!.healthScore ?? 0)) improvementStreak++
      else break
    }
  }

  // Score improvement wins since last session
  const scoreWins = auditIssuesRaw
    .map(({ site }) => {
      const siteAudits = latestAudits.map((a, i) => ({ audit: a, siteId: sites[i]?.id })).filter(x => x.siteId === site.id)
      const latest = siteAudits[0]?.audit
      // Not using prev from this batch — use latestAudits index instead
      return { site, healthScore: latest?.healthScore ?? null }
    })
    .filter(x => x.healthScore != null && x.healthScore >= 80)
    .sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0))
    .slice(0, 3)

  // Recent audit activity feed (last 5 audits across all sites)
  const recentActivity = latestAudits
    .map((a, i) => ({ audit: a, site: sites[i]! }))
    .filter(x => x.audit != null)
    .sort((a, b) => new Date(b.audit!.createdAt ?? 0).getTime() - new Date(a.audit!.createdAt ?? 0).getTime())
    .slice(0, 5)

  // Most improved site: biggest positive score delta between last 2 completed audits
  const siteImprovements: { site: typeof sites[0]; gain: number; score: number }[] = []
  for (const siteAuditData of completeAuditsWithSite) {
    const allSiteAudits = await getAuditsForSite(siteAuditData.site.id, 3)
    const completed = allSiteAudits.filter(a => a.status === "complete" && a.healthScore != null)
    if (completed.length >= 2) {
      const gain = (completed[0]!.healthScore ?? 0) - (completed[1]!.healthScore ?? 0)
      if (gain > 0) siteImprovements.push({ site: siteAuditData.site, gain, score: completed[0]!.healthScore! })
    }
  }
  const mostImprovedSite = siteImprovements.sort((a, b) => b.gain - a.gain)[0] ?? null

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1200px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "36px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "3px 10px", borderRadius: "20px",
              background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
              fontSize: "10px", fontWeight: 700, color: "var(--primary-2)",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--primary-2)" }} />
              {user.plan} plan
            </span>
            {(() => {
              const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]
              const sitePct = Math.round(sites.length / limits.sites * 100)
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{sites.length}/{limits.sites} sites</span>
                  <div style={{ width: "60px", height: "4px", background: "oklch(0.20 0.006 230)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${Math.min(sitePct, 100)}%`, background: sitePct >= 90 ? "var(--destructive)" : sitePct >= 70 ? "var(--warning)" : "var(--primary)", borderRadius: "2px" }} />
                  </div>
                </div>
              )
            })()}
          </div>
          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.8px", marginBottom: "6px", lineHeight: 1.1 }}>
            Welcome back, {user.name?.split(" ")[0] ?? "there"}.
          </h1>
          <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.6 }}>
            Here&apos;s your SEO overview across {sites.length} site{sites.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {sites.length > 1 && (
            <Link href="/agency" style={{
              padding: "9px 16px", fontSize: "12px", fontWeight: 600,
              background: "oklch(0.98 0 0 / 0.04)", color: "var(--foreground-2)",
              border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
              textDecoration: "none",
            }}>Agency View</Link>
          )}
          <Link href="/sites/new" style={{
            padding: "9px 18px", fontSize: "13px", fontWeight: 700,
            background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
            color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
            textDecoration: "none", letterSpacing: "0.02em",
            boxShadow: "var(--shadow-glow)",
          }}>+ Add Site</Link>
        </div>
      </div>

      <WhatsNew />
      <OnboardingChecklist
        hasSite={sites.length > 0}
        hasAudit={completedAudits > 0}
        hasGsc={sites.some(s => s.gscConnected)}
        hasKeywords={false}
      />

      {/* Sites missing GSC connection */}
      {(() => {
        const noGsc = sites.filter(s => !s.gscConnected)
        if (noGsc.length === 0 || noGsc.length === sites.length) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 270 / 0.3)", border: "1px solid oklch(0.60 0.10 270 / 0.3)", borderRadius: "var(--radius-lg)", padding: "10px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
            <span style={{ fontSize: "14px" }}>🔌</span>
            <span style={{ color: "var(--foreground-2)", flex: 1 }}>
              <strong style={{ color: "oklch(0.70 0.12 270)" }}>{noGsc.length} site{noGsc.length !== 1 ? "s" : ""}</strong> not connected to Google Search Console:{" "}
              {noGsc.slice(0, 3).map(s => s.displayName ?? s.domain).join(", ")}{noGsc.length > 3 ? ` +${noGsc.length - 3} more` : ""}
            </span>
            <span style={{ fontSize: "10px", color: "var(--foreground-3)", flexShrink: 0 }}>Connect for keyword data</span>
          </div>
        )
      })()}

      {/* Stale sites alert */}
      {staleSites.length > 0 && (
        <div style={{
          background: "oklch(0.14 0.05 70 / 0.6)", border: "1px solid oklch(0.80 0.15 75 / 0.3)",
          borderRadius: "var(--radius-lg)", padding: "10px 16px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "12px", fontSize: "12px",
        }}>
          <span style={{ color: "var(--warning)", fontSize: "14px" }}>⏰</span>
          <span style={{ color: "var(--foreground-2)", flex: 1 }}>
            <strong style={{ color: "var(--warning)" }}>{staleSites.length} site{staleSites.length !== 1 ? "s" : ""}</strong> not audited in the last 30 days:{" "}
            {staleSites.slice(0, 3).map(s => s.displayName ?? s.domain).join(", ")}{staleSites.length > 3 ? ` +${staleSites.length - 3} more` : ""}
          </span>
          <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>Consider running audits to stay current</span>
        </div>
      )}

      {/* Low-score sites needing attention */}
      {(() => {
        const lowScoreSites = latestAudits
          .map((a, i) => ({ audit: a, site: sites[i]! }))
          .filter(x => x.audit?.status === "complete" && (x.audit.healthScore ?? 100) < 50)
          .sort((a, b) => (a.audit!.healthScore ?? 0) - (b.audit!.healthScore ?? 0))
          .slice(0, 3)
        if (lowScoreSites.length === 0) return null
        return (
          <div style={{ background: "oklch(0.14 0.05 27 / 0.4)", border: "1px solid oklch(0.65 0.20 27 / 0.3)", borderRadius: "var(--radius-lg)", padding: "10px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
            <span style={{ color: "var(--destructive)", fontSize: "14px", flexShrink: 0 }}>🔴</span>
            <span style={{ color: "var(--foreground-2)", flex: 1 }}>
              <strong style={{ color: "var(--destructive)" }}>{lowScoreSites.length} site{lowScoreSites.length !== 1 ? "s" : ""} need attention</strong>{" — "}
              {lowScoreSites.map(x => `${x.site.displayName ?? x.site.domain} (${x.audit!.healthScore})`).join(", ")}
            </span>
          </div>
        )
      })()}

      {/* KPI strip */}
      {sites.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px", marginBottom: "32px" }}>
          <MiniKpi label="Avg Health Score" value={avgHealth != null ? `${avgHealth}` : "—"} color={avgHealth != null && avgHealth >= 90 ? "var(--success)" : avgHealth != null && avgHealth >= 70 ? "var(--primary-2)" : "var(--warning)"} />
          <MiniKpi label="Audits Done" value={`${completedAudits} / ${sites.length}`} color="var(--primary-2)" />
          <MiniKpi label="Sites Monitored" value={`${sites.length}`} color="var(--info)" />
          <MiniKpi label={runningAudits > 0 ? "Auditing Now" : "Low Score Sites"} value={runningAudits > 0 ? `${runningAudits}` : `${totalCritical}`} color={runningAudits > 0 ? "var(--primary)" : totalCritical > 0 ? "var(--destructive)" : "var(--success)"} />
          <MiniKpi label="Total Pages Crawled" value={totalPagesCrawled.toLocaleString()} color="var(--foreground-2)" />
          {totalOpenIssues > 0 && <MiniKpi label="Open Issues" value={totalOpenIssues.toLocaleString()} color={totalOpenIssues > 50 ? "var(--destructive)" : totalOpenIssues > 20 ? "var(--warning)" : "var(--foreground-2)"} />}
          {improvementStreak >= 2 && <MiniKpi label="🔥 Score Streak" value={`${improvementStreak} audits`} color="var(--success)" />}
          {mostImprovedSite && <MiniKpi label={`↑ Most improved: ${mostImprovedSite.site.displayName ?? mostImprovedSite.site.domain}`} value={`+${mostImprovedSite.gain} pts`} color="var(--success)" />}
        </div>
      )}

      {/* Starter plan upgrade CTA */}
      {user.plan === "starter" && sites.length >= 1 && (
        <div style={{
          background: "linear-gradient(135deg, oklch(0.16 0.04 196 / 0.6), oklch(0.14 0.04 178 / 0.4))",
          border: "1px solid oklch(0.55 0.13 178 / 0.3)", borderRadius: "var(--radius-xl)",
          padding: "14px 20px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "16px",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-2)", marginBottom: "2px" }}>
              You&apos;re on the Starter plan — limited to 1 site & 100 pages per audit
            </div>
            <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>
              Upgrade to Growth for 5 sites, 500 pages, and 20 audits/month.
            </div>
          </div>
          <Link href="/pricing" style={{
            padding: "7px 16px", fontSize: "12px", fontWeight: 700,
            background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
            color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
            textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
            boxShadow: "var(--shadow-glow)",
          }}>Upgrade →</Link>
        </div>
      )}

      {sites.length === 0 ? <EmptyState /> : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            {(() => {
              const needsReview = latestAudits
                .map((a, i) => ({ site: sites[i]!, score: a?.healthScore }))
                .filter(d => d.site != null)
                .filter(d => d.score != null && d.score < 60)
                .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
                .slice(0, 3)
              if (needsReview.length === 0) return null
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Review first:
                  </span>
                  {needsReview.map(d => (
                    <Link key={d.site.id} href={`/sites/${d.site.id}` as any} style={{
                      fontSize: "10px", color: "var(--destructive)", textDecoration: "none",
                      padding: "2px 8px", border: "1px solid oklch(0.65 0.20 27 / 0.3)",
                      borderRadius: "20px", background: "oklch(0.14 0.05 27 / 0.3)",
                    }}>{d.site.displayName ?? d.site.domain} ({d.score})</Link>
                  ))}
                </div>
              )
            })()}
            <SiteFilter count={sites.length} />
          </div>
          {(() => {
            const best = latestAudits.map((a, i) => ({ site: sites[i]!, score: a?.healthScore })).filter(d => d.score != null && d.score >= 90).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
            if (!best) return null
            return (
              <div style={{ marginBottom: "12px", padding: "8px 14px", background: "oklch(0.16 0.05 155 / 0.15)", border: "1px solid oklch(0.68 0.16 155 / 0.2)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "10px", color: "var(--success)", fontWeight: 700 }}>✦ Top site</span>
                <span style={{ fontSize: "12px", color: "var(--foreground-2)", fontWeight: 600 }}>{best.site.displayName ?? best.site.domain}</span>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--success)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>{best.score}</span>
              </div>
            )
          })()}
          <SiteGrid sites={sites} latestAudits={latestAudits} />
          {allCriticalIssues.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                ⚠ Critical issues needing attention
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {allCriticalIssues.map(issue => (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <Link key={issue.id} href={`/audits/${issue.auditId}` as any} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    background: "var(--destructive-bg)", border: "1px solid oklch(0.65 0.20 27 / 0.2)",
                    borderRadius: "var(--radius-lg)", padding: "12px 16px",
                    textDecoration: "none",
                  }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--destructive)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", marginBottom: "2px" }}>{issue.title}</div>
                      <div style={{ fontSize: "10px", color: "var(--foreground-3)" }}>{issue.siteDomain} · {issue.affectedCount} page{issue.affectedCount !== 1 ? "s" : ""}</div>
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--primary-2)", fontWeight: 600, flexShrink: 0 }}>Fix →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent audit activity */}
          {recentActivity.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                Recent activity
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {recentActivity.map(({ audit, site }) => {
                  const scoreColor = audit!.healthScore == null ? "var(--foreground-3)"
                    : audit!.healthScore >= 80 ? "var(--success)"
                    : audit!.healthScore >= 50 ? "var(--warning)"
                    : "var(--destructive)"
                  return (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <Link key={audit!.id} href={`/audits/${audit!.id}` as any} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                      borderRadius: "var(--radius-lg)", padding: "10px 16px",
                      textDecoration: "none",
                    }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                        background: "oklch(0.14 0.006 230)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", fontWeight: 800, color: scoreColor, fontFamily: "var(--font-mono)",
                      }}>
                        {audit!.healthScore ?? "—"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>{site.displayName ?? site.domain}</div>
                        <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginTop: "1px" }}>
                          {audit!.status === "complete" ? `${audit!.pagesCount ?? 0} pages · ${audit!.completedAt ? new Date(audit!.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}` : audit!.status}
                        </div>
                      </div>
                      <div style={{
                        fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px",
                        background: audit!.status === "complete" ? "var(--success-bg)" : audit!.status === "running" ? "var(--primary-soft)" : "oklch(0.18 0.008 230)",
                        color: audit!.status === "complete" ? "var(--success)" : audit!.status === "running" ? "var(--primary-2)" : "var(--foreground-3)",
                        textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
                      }}>
                        {audit!.status}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Scheduled audits */}
          {(() => {
            const scheduled = sites.filter(s => s.auditSchedule && s.auditSchedule !== "off")
            if (scheduled.length === 0) return null
            return (
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  ⏱ Scheduled
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {scheduled.map(s => (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <Link key={s.id} href={`/sites/${s.id}` as any} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: "oklch(0.16 0.04 270 / 0.15)", border: "1px solid oklch(0.60 0.10 270 / 0.2)", borderRadius: "var(--radius-md)", textDecoration: "none" }}>
                      <span style={{ fontSize: "11px", color: "var(--foreground-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.displayName ?? s.domain}</span>
                      <span style={{ fontSize: "9px", color: "oklch(0.70 0.12 270)", fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>{s.auditSchedule}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Recently fixed issues */}
          {recentlyFixed.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                ✓ Recently fixed
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {recentlyFixed.map((issue) => (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <Link key={issue.id} href={`/audits/${issue.auditId}` as any} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 12px",
                    background: "oklch(0.16 0.05 155 / 0.12)",
                    border: "1px solid oklch(0.68 0.16 155 / 0.15)",
                    borderRadius: "var(--radius-md)", textDecoration: "none",
                  }}>
                    <span style={{ fontSize: "10px", color: "var(--success)", flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: "12px", color: "var(--foreground-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issue.title}</span>
                    <span style={{ fontSize: "10px", color: "var(--foreground-3)", flexShrink: 0 }}>{issue.siteDomain}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MiniKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "16px 20px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1, filter: `drop-shadow(0 0 8px ${color}80)` }}>{value}</div>
    </div>
  )
}

function EmptyState() {
  const steps = [
    { num: 1, label: "Sign in with Google", done: true, href: null },
    { num: 2, label: "Add your first website", done: false, href: "/sites/new" },
    { num: 3, label: "Review your AI action plan", done: false, href: null },
  ]
  return (
    <div style={{ maxWidth: "520px" }}>
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "36px 32px", marginBottom: "16px",
      }}>
        {/* Icon */}
        <div style={{
          width: "52px", height: "52px", borderRadius: "14px",
          background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px", boxShadow: "0 0 20px var(--primary-glow)",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="oklch(0.65 0.13 196)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M12 7L17 12L12 17L7 12L12 7Z" fill="oklch(0.55 0.13 178)" fillOpacity="0.4"/>
          </svg>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.4px", marginBottom: "8px" }}>
          Welcome to RankIQ
        </h2>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.7, marginBottom: "28px" }}>
          Get started in 3 steps — your first full SEO audit takes less than 5 minutes.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {steps.map(step => (
            <div key={step.num} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "12px 16px", borderRadius: "var(--radius-lg)",
              background: step.done ? "var(--success-bg)" : !step.done && step.href ? "var(--primary-soft)" : "oklch(0.14 0.006 230)",
              border: `1px solid ${step.done ? "oklch(0.68 0.16 155 / 0.3)" : !step.done && step.href ? "oklch(0.55 0.13 178 / 0.3)" : "var(--glass-border)"}`,
            }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                background: step.done ? "var(--success)" : !step.done && step.href ? "var(--primary)" : "oklch(0.22 0.006 230)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 800, color: "white",
              }}>
                {step.done ? "✓" : step.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "13px", fontWeight: 600,
                  color: step.done ? "var(--success)" : !step.done && step.href ? "var(--foreground)" : "var(--foreground-3)",
                  textDecoration: step.done ? "line-through" : "none",
                }}>
                  {step.label}
                </div>
              </div>
              {step.href && !step.done && (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Link href={step.href as any} style={{
                  padding: "5px 12px", fontSize: "11px", fontWeight: 700,
                  background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
                  color: "var(--primary-foreground)", borderRadius: "var(--radius)", textDecoration: "none",
                  boxShadow: "var(--shadow-glow)", flexShrink: 0,
                }}>Start →</Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: "16px 20px", borderRadius: "var(--radius-xl)",
        background: "oklch(0.14 0.006 230)", border: "1px solid var(--glass-border)",
        fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.6,
      }}>
        💡 RankIQ supports static sites, React, Next.js, Vue, and Angular apps — powered by Playwright fallback for JS-rendered pages.
      </div>
    </div>
  )
}

function SiteGrid({ sites, latestAudits }: { sites: Site[]; latestAudits: (Audit | undefined)[] }) {
  return (
    <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
      {sites.map((site, i) => {
        const audit = latestAudits[i]
        const score = audit?.healthScore
        const scoreColor = score == null ? "var(--foreground-3)"
          : score >= 90 ? "var(--success)"
          : score >= 70 ? "var(--primary-2)"
          : score >= 50 ? "var(--warning)"
          : "var(--destructive)"
        const statusText = audit == null ? "No audits yet"
          : audit.status === "complete" ? `${audit.pagesCount ?? 0} pages crawled`
          : audit.status === "running" ? "Auditing…"
          : audit.status === "queued" ? "Queued…"
          : "Last audit failed"

        return (
          <Link key={site.id} href={`/sites/${site.id}`} className="card-hover" data-site-card="1" data-site-name={`${site.displayName ?? ""} ${site.domain}`} style={{
            display: "block", padding: "22px",
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            textDecoration: "none", position: "relative", overflow: "hidden",
          }}>
            {/* Top accent line */}
            {score != null && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                background: `linear-gradient(90deg, ${scoreColor}, transparent)`,
              }} />
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "3px", letterSpacing: "-0.2px" }}>
                  {site.displayName ?? site.domain}
                </div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>
                  {site.domain}
                </div>
              </div>
              {score != null && (
                <div style={{
                  fontSize: "28px", fontWeight: 900, color: scoreColor,
                  fontFamily: "var(--font-mono)", lineHeight: 1,
                  filter: `drop-shadow(0 0 8px ${scoreColor})`,
                }}>
                  {score}
                </div>
              )}
            </div>

            {/* Mini health bar */}
            {score != null && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}80)`, borderRadius: "2px", transition: "width 0.8s var(--ease-out)" }} />
                </div>
              </div>
            )}

            {audit?.status === "complete" && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>
                  {audit.completedAt ? new Date(audit.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                </span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{statusText}</div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {site.auditSchedule && site.auditSchedule !== "off" && (
                  <span style={{
                    padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700,
                    background: "oklch(0.20 0.04 270 / 0.6)", border: "1px solid oklch(0.60 0.10 270 / 0.3)",
                    color: "oklch(0.70 0.12 270)", textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>⏱ {site.auditSchedule}</span>
                )}
                {site.gscConnected && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "3px",
                    padding: "2px 7px", borderRadius: "4px",
                    background: "var(--success-bg)", fontSize: "9px", fontWeight: 700,
                    color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--success)" }} />GSC
                  </span>
                )}
                {audit?.status === "running" || audit?.status === "queued" ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "3px",
                    padding: "2px 7px", borderRadius: "4px",
                    background: "var(--primary-soft)", fontSize: "9px", fontWeight: 700,
                    color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>Live</span>
                ) : (
                  <Link href={`/sites/${site.id}`} onClick={e => e.stopPropagation()} style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 9px", borderRadius: "5px", fontSize: "9px", fontWeight: 700,
                    background: "var(--primary-soft)", color: "var(--primary-2)",
                    border: "1px solid oklch(0.55 0.13 178 / 0.3)", textDecoration: "none",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    ▶ Audit
                  </Link>
                )}
              </div>
            </div>
          </Link>
        )
      })}

      {/* Add new site card */}
      <Link href="/sites/new" className="add-card-hover" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "22px", minHeight: "120px",
        background: "oklch(0.12 0.008 230 / 0.3)",
        border: "1px dashed oklch(0.55 0.13 178 / 0.25)",
        borderRadius: "var(--radius-xl)", textDecoration: "none",
        flexDirection: "column", gap: "8px",
      }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="oklch(0.65 0.13 196)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary-2)" }}>Add site</span>
      </Link>
    </div>
  )
}
