export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"
import { getKeywordPositionChanges } from "@/db/repositories/gsc"
import { getGscAuthUrl } from "@/domain/sites/gsc"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { RunAuditButton } from "./RunAuditButton"
import { DeleteSiteButton } from "./DeleteSiteButton"
import type { Metadata } from "next"
import type { GscKeywordMetric } from "@/db/schema"

type KeywordWithChange = GscKeywordMetric & { prevPosition: string | null; positionChange: number | null }

export const metadata: Metadata = { title: "Site Overview" }

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ gsc?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const sp = await searchParams

  const site = await getSiteById(id, session.user.id)
  if (!site) notFound()

  const [audits, keywords] = await Promise.all([
    getAuditsForSite(id),
    site.gscConnected ? getKeywordPositionChanges(id, 25) : Promise.resolve([]),
  ])

  const completedAudits = audits
    .filter((a) => a.status === "complete" && a.healthScore != null)
    .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0))

  const latestAudit = audits.find((a) => a.status === "complete")
  const runningAudit = audits.find((a) => a.status === "running" || a.status === "queued")
  const authUrl = site.gscConnected ? null : getGscAuthUrl(id, session.user.id)

  const latestScore = latestAudit?.healthScore ?? null
  const prevScore = completedAudits.length >= 2 ? completedAudits[completedAudits.length - 2].healthScore : null
  const trend = latestScore != null && prevScore != null ? latestScore - prevScore : null

  const scoreColor = latestScore == null ? "var(--foreground-3)"
    : latestScore >= 90 ? "var(--success)"
    : latestScore >= 70 ? "var(--primary-2)"
    : latestScore >= 50 ? "var(--warning)"
    : "var(--destructive)"

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1000px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: "12px", color: "var(--foreground-3)", textDecoration: "none" }}>
            ← All sites
          </Link>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", marginTop: "10px", marginBottom: "4px" }}>
            {site.displayName ?? site.domain}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>{site.domain}</span>
            {site.gscConnected && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "2px 7px", borderRadius: "4px",
                background: "var(--success-bg)", fontSize: "9px", fontWeight: 700,
                color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--success)" }} />GSC
              </span>
            )}
            {runningAudit && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "2px 7px", borderRadius: "4px",
                background: "var(--primary-soft)", fontSize: "9px", fontWeight: 700,
                color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Auditing…</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {latestAudit && (
            <Link href={`/audits/${latestAudit.id}`} style={{
              padding: "9px 16px", background: "var(--glass-bg)",
              color: "var(--foreground-2)", borderRadius: "var(--radius-md)",
              fontSize: "13px", fontWeight: 600, textDecoration: "none",
              border: "1px solid var(--glass-border)",
            }}>
              Latest Audit
            </Link>
          )}
          <Link href={`/sites/${id}/compare`} style={{
            padding: "9px 16px", background: "var(--glass-bg)",
            color: "var(--foreground-3)", borderRadius: "var(--radius-md)",
            fontSize: "12px", fontWeight: 600, textDecoration: "none",
            border: "1px solid var(--glass-border)",
          }}>Compare</Link>
          <RunAuditButton siteId={id} />
          <DeleteSiteButton siteId={id} domain={site.domain} />
        </div>
      </div>

      {/* GSC notification banners */}
      {sp.gsc === "connected" && (
        <div style={{ padding: "12px 16px", background: "var(--success-bg)", border: "1px solid oklch(0.55 0.16 155 / 0.3)", borderRadius: "var(--radius-md)", color: "var(--success)", fontSize: "13px", fontWeight: 500, marginBottom: "20px" }}>
          ✓ Google Search Console connected. Keyword data is importing now.
        </div>
      )}
      {sp.gsc === "error" && (
        <div style={{ padding: "12px 16px", background: "var(--destructive-bg)", border: "1px solid oklch(0.55 0.20 27 / 0.3)", borderRadius: "var(--radius-md)", color: "var(--destructive)", fontSize: "13px", fontWeight: 500, marginBottom: "20px" }}>
          GSC connection failed. Please try again.
        </div>
      )}

      {/* Score hero + stats */}
      {latestScore != null && (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "24px 28px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "32px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${scoreColor}, transparent)` }} />
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: "56px", fontWeight: 900, color: scoreColor, fontFamily: "var(--font-mono)", lineHeight: 1, filter: `drop-shadow(0 0 12px ${scoreColor})` }}>
              {latestScore}
            </div>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>Health Score</div>
          </div>
          <div style={{ flex: 1, borderLeft: "1px solid var(--glass-border)", paddingLeft: "32px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "16px" }}>
              {trend != null && (
                <span style={{ fontSize: "14px", fontWeight: 700, color: trend >= 0 ? "var(--success)" : "var(--destructive)" }}>
                  {trend >= 0 ? `↑ +${trend}` : `↓ ${trend}`}
                </span>
              )}
              {trend != null && <span style={{ fontSize: "12px", color: "var(--foreground-3)" }}>vs previous audit</span>}
            </div>
            {completedAudits.length > 1 && <HealthChart audits={completedAudits} />}
          </div>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            <StatPill label="Audits Run" value={`${completedAudits.length}`} />
            <StatPill label="Pages (latest)" value={`${latestAudit?.pagesCount ?? 0}`} />
            <StatPill label="Keywords" value={`${keywords.length}`} />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Audit History */}
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
            Audit History
          </div>
          {audits.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--foreground-3)", paddingTop: "4px" }}>No audits yet. Run your first audit.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {audits.slice(0, 5).map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>
                      {a.completedAt ? new Date(a.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "In progress"}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginTop: "1px" }}>{a.pagesCount ?? 0} pages</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {a.healthScore != null && (
                      <span style={{
                        fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-mono)",
                        color: a.healthScore >= 90 ? "var(--success)" : a.healthScore >= 70 ? "var(--primary-2)" : a.healthScore >= 50 ? "var(--warning)" : "var(--destructive)",
                      }}>{a.healthScore}</span>
                    )}
                    {a.status === "complete" && (
                      <Link href={`/audits/${a.id}`} style={{
                        padding: "3px 8px", fontSize: "10px", fontWeight: 600,
                        background: "var(--primary-soft)", color: "var(--primary-2)",
                        borderRadius: "var(--radius)", textDecoration: "none",
                        border: "1px solid oklch(0.55 0.13 178 / 0.3)",
                      }}>View</Link>
                    )}
                    {(a.status === "running" || a.status === "queued") && (
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase" }}>
                        {a.status}…
                      </span>
                    )}
                    {a.status === "failed" && (
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase" }}>Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GSC Panel */}
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
            Google Search Console
          </div>
          {site.gscConnected ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--success)" }}>Connected</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.65, marginBottom: "14px" }}>
                Keyword ranking data from the last 28 days is synced and shown below.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <form action={`/api/v1/sites/${id}/gsc`} method="POST" style={{ display: "inline" }}>
                  <button type="submit" style={{
                    padding: "7px 12px", background: "var(--primary-soft)",
                    color: "var(--primary-2)", borderRadius: "var(--radius)", fontSize: "12px",
                    fontWeight: 600, border: "1px solid oklch(0.55 0.13 178 / 0.3)", cursor: "pointer",
                  }}>
                    Refresh data
                  </button>
                </form>
                <form action={`/api/v1/sites/${id}/gsc`} method="POST" style={{ display: "inline" }}>
                  <input type="hidden" name="_method" value="DELETE" />
                  <button type="submit" style={{
                    padding: "7px 12px", background: "transparent",
                    color: "var(--foreground-3)", borderRadius: "var(--radius)", fontSize: "12px",
                    fontWeight: 600, border: "1px solid var(--glass-border)", cursor: "pointer",
                  }}>
                    Disconnect
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.65, marginBottom: "16px" }}>
                Connect Search Console to unlock keyword rankings, impressions, click-through rates, and position tracking.
              </p>
              <a href={authUrl ?? "#"} style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "9px 18px", fontSize: "13px", fontWeight: 700,
                background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
                color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
                textDecoration: "none", boxShadow: "var(--shadow-glow)",
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M2.5 7h9M7 2.5c-1.5 1.5-2 3-2 4.5s.5 3 2 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Connect Google Search Console
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Keyword Table */}
      {site.gscConnected && keywords.length > 0 && <KeywordTable keywords={keywords as KeywordWithChange[]} siteId={id} />}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  )
}

function HealthChart({ audits }: { audits: Array<{ id: string; healthScore: number | null; completedAt: Date | null }> }) {
  const scores = audits.map((a) => a.healthScore ?? 0)
  const width = 260
  const height = 60
  const padX = 4
  const padY = 4
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const points = scores.map((s, i) => {
    const x = padX + (scores.length === 1 ? innerW / 2 : (i / (scores.length - 1)) * innerW)
    const y = padY + innerH - (s / 100) * innerH
    return `${x},${y}`
  })

  const areaPoints = [
    `${padX},${padY + innerH}`,
    ...points,
    `${padX + innerW},${padY + innerH}`,
  ].join(" ")

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.13 178)" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="oklch(0.55 0.13 178)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chart-fill)" />
      <polyline points={points.join(" ")} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {scores.map((_, i) => {
        const [x, y] = (points[i] ?? "0,0").split(",").map(Number)
        return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--primary-2)" />
      })}
    </svg>
  )
}

function KeywordTable({ keywords, siteId: _siteId }: { keywords: KeywordWithChange[], siteId: string }) {
  const sorted = [...keywords].sort((a, b) => b.clicks - a.clicks)
  const hasHistory = sorted.some(k => k.positionChange != null)

  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "18px 24px 12px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Keyword Rankings (28 days)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {hasHistory && <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>vs previous period</span>}
          <span style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{sorted.length} keywords</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Keyword", "Position", hasHistory ? "Change" : null, "Clicks", "Impressions", "CTR"].filter(Boolean).map((h) => (
                <th key={h!} style={{
                  padding: "10px 16px", fontSize: "10px", fontWeight: 700,
                  color: "var(--foreground-3)", textAlign: h === "Keyword" ? "left" : "center",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  borderBottom: "1px solid var(--glass-border)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((k, i) => {
              const pos = Number(k.positionAvg)
              const posColor = pos <= 3 ? "var(--success)" : pos <= 10 ? "var(--primary-2)" : pos <= 20 ? "var(--warning)" : "var(--foreground-3)"
              const change = k.positionChange
              return (
                <tr key={k.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--glass-border)" : "none" }}>
                  <td style={{ padding: "11px 16px", fontSize: "13px", color: "var(--foreground)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {k.keyword}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "center" }}>
                    <span style={{
                      fontSize: "13px", fontWeight: 700, color: posColor,
                      fontFamily: "var(--font-mono)",
                      filter: pos <= 3 ? "drop-shadow(0 0 4px var(--success))" : "none",
                    }}>#{pos.toFixed(1)}</span>
                  </td>
                  {hasHistory && (
                    <td style={{ padding: "11px 16px", textAlign: "center" }}>
                      {change != null ? (
                        <span style={{
                          fontSize: "11px", fontWeight: 700,
                          color: change > 0 ? "var(--success)" : change < 0 ? "var(--destructive)" : "var(--foreground-3)",
                          fontFamily: "var(--font-mono)",
                        }}>
                          {change > 0 ? `↑ +${change}` : change < 0 ? `↓ ${change}` : "—"}
                        </span>
                      ) : <span style={{ color: "var(--foreground-3)", fontSize: "11px" }}>new</span>}
                    </td>
                  )}
                  <td style={{ padding: "11px 16px", fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
                    {k.clicks.toLocaleString()}
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: "13px", color: "var(--foreground-2)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
                    {k.impressions.toLocaleString()}
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: "13px", color: "var(--foreground-2)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
                    {Number(k.ctrPct).toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
