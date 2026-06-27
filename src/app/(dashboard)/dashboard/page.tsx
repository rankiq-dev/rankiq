export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getUserById } from "@/db/repositories/users"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { Site, Audit } from "@/db/schema"

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
  const totalIssues = latestAudits.reduce((s, a) => s + (a?.pagesCount != null ? 0 : 0), 0)

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

      {/* KPI strip */}
      {sites.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "32px" }}>
          <MiniKpi label="Avg Health Score" value={avgHealth != null ? `${avgHealth}` : "—"} color={avgHealth != null && avgHealth >= 90 ? "var(--success)" : avgHealth != null && avgHealth >= 70 ? "var(--primary-2)" : "var(--warning)"} />
          <MiniKpi label="Audits Complete" value={`${completedAudits} / ${sites.length}`} color="var(--primary-2)" />
          <MiniKpi label="Sites Monitored" value={`${sites.length}`} color="var(--info)" />
        </div>
      )}

      {sites.length === 0 ? <EmptyState /> : <SiteGrid sites={sites} latestAudits={latestAudits} />}
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
  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "80px 40px", textAlign: "center", maxWidth: "480px",
    }}>
      <div style={{
        width: "64px", height: "64px", borderRadius: "16px",
        background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 24px",
        boxShadow: "0 0 24px var(--primary-glow)",
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="10" stroke="oklch(0.65 0.13 196)" strokeWidth="1.5" strokeDasharray="3 2"/>
          <path d="M14 8v6l4 2" stroke="oklch(0.65 0.13 196)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--foreground)", marginBottom: "10px", letterSpacing: "-0.4px" }}>
        No sites yet
      </h2>
      <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.7, marginBottom: "28px" }}>
        Add your first website and RankIQ will crawl it, surface SEO issues, and generate an AI-powered action plan.
      </p>
      <Link href="/sites/new" style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "11px 24px", fontSize: "13px", fontWeight: 700,
        background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
        color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
        textDecoration: "none", boxShadow: "var(--shadow-glow)",
      }}>+ Add your first site</Link>
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
          <Link key={site.id} href={`/sites/${site.id}`} style={{
            display: "block", padding: "22px",
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            textDecoration: "none", position: "relative", overflow: "hidden",
            transition: "border-color 200ms, box-shadow 200ms",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = "oklch(0.55 0.13 178 / 0.4)"
            el.style.boxShadow = "0 0 24px oklch(0.55 0.13 178 / 0.12)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = "var(--glass-border)"
            el.style.boxShadow = "none"
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{statusText}</div>
              <div style={{ display: "flex", gap: "6px" }}>
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
                {audit?.status === "running" && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "3px",
                    padding: "2px 7px", borderRadius: "4px",
                    background: "var(--primary-soft)", fontSize: "9px", fontWeight: 700,
                    color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>Live</span>
                )}
              </div>
            </div>
          </Link>
        )
      })}

      {/* Add new site card */}
      <Link href="/sites/new" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "22px", minHeight: "120px",
        background: "oklch(0.12 0.008 230 / 0.3)",
        border: "1px dashed oklch(0.55 0.13 178 / 0.25)",
        borderRadius: "var(--radius-xl)", textDecoration: "none",
        flexDirection: "column", gap: "8px",
        transition: "border-color 200ms, background 200ms",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = "oklch(0.55 0.13 178 / 0.5)"
        el.style.background = "var(--primary-soft)"
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = "oklch(0.55 0.13 178 / 0.25)"
        el.style.background = "oklch(0.12 0.008 230 / 0.3)"
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
