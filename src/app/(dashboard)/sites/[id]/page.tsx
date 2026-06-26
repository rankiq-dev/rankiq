import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"
import { getKeywordMetricsBySite } from "@/db/repositories/gsc"
import { getGscAuthUrl } from "@/domain/sites/gsc"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { RunAuditButton } from "./RunAuditButton"
import type { Metadata } from "next"
import type { GscKeywordMetric } from "@/db/schema"

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
    site.gscConnected ? getKeywordMetricsBySite(id, 20) : Promise.resolve([]),
  ])

  const completedAudits = audits
    .filter((a) => a.status === "complete" && a.healthScore != null)
    .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0))

  const latestAudit = audits.find((a) => a.status === "complete")
  const authUrl = site.gscConnected ? null : getGscAuthUrl(id, session.user.id)

  return (
    <div style={{ padding: "32px 40px", maxWidth: "960px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: "12px", color: "oklch(0.38 0.008 230)", textDecoration: "none" }}>
            ← All sites
          </Link>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.5px", marginTop: "8px", marginBottom: "4px" }}>
            {site.displayName ?? site.domain}
          </h1>
          <p style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)" }}>{site.domain}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {latestAudit && (
            <Link
              href={`/audits/${latestAudit.id}`}
              style={{
                padding: "9px 16px",
                background: "oklch(0.18 0.006 230)",
                color: "oklch(0.78 0.008 230)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid oklch(0.98 0 0 / 0.06)",
              }}
            >
              View latest audit
            </Link>
          )}
          <RunAuditButton siteId={id} />
        </div>
      </div>

      {/* GSC banner notification */}
      {sp.gsc === "connected" && (
        <div style={{ padding: "12px 16px", background: "oklch(0.14 0.07 155 / 0.8)", border: "1px solid oklch(0.55 0.16 155 / 0.3)", borderRadius: "8px", color: "oklch(0.78 0.16 155)", fontSize: "13px", marginBottom: "24px" }}>
          ✓ Google Search Console connected. Keyword data is importing now.
        </div>
      )}
      {sp.gsc === "error" && (
        <div style={{ padding: "12px 16px", background: "oklch(0.14 0.07 27 / 0.8)", border: "1px solid oklch(0.55 0.20 27 / 0.3)", borderRadius: "8px", color: "oklch(0.78 0.20 27)", fontSize: "13px", marginBottom: "24px" }}>
          GSC connection failed. Please try again.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Health Score History */}
        <div style={{
          background: "oklch(0.12 0.008 230 / 0.60)",
          border: "1px solid oklch(0.98 0 0 / 0.06)",
          borderRadius: "14px",
          padding: "24px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "oklch(0.55 0.13 178)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Health Score History
          </div>
          {completedAudits.length === 0 ? (
            <div style={{ fontSize: "13px", color: "oklch(0.38 0.008 230)", paddingTop: "8px" }}>
              No completed audits yet. Run your first audit.
            </div>
          ) : (
            <HealthChart audits={completedAudits} />
          )}
        </div>

        {/* GSC Connection Panel */}
        <div style={{
          background: "oklch(0.12 0.008 230 / 0.60)",
          border: "1px solid oklch(0.98 0 0 / 0.06)",
          borderRadius: "14px",
          padding: "24px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "oklch(0.55 0.13 178)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Google Search Console
          </div>
          {site.gscConnected ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "oklch(0.68 0.16 155)" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "oklch(0.78 0.10 155)" }}>Connected</span>
              </div>
              <p style={{ fontSize: "12px", color: "oklch(0.55 0.008 230)", lineHeight: 1.6 }}>
                Keyword ranking data is syncing. Click refresh to pull the latest 28 days.
              </p>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <form action={`/api/v1/sites/${id}/gsc`} method="POST" style={{ display: "inline" }}>
                  <button type="submit" style={{ padding: "7px 12px", background: "oklch(0.18 0.006 230)", color: "oklch(0.78 0.008 230)", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "1px solid oklch(0.98 0 0 / 0.06)", cursor: "pointer" }}>
                    Refresh data
                  </button>
                </form>
                <form action={`/api/v1/sites/${id}/gsc`} method="POST" style={{ display: "inline" }}>
                  <input type="hidden" name="_method" value="DELETE" />
                  <button type="submit" style={{ padding: "7px 12px", background: "transparent", color: "oklch(0.55 0.008 230)", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "1px solid oklch(0.98 0 0 / 0.06)", cursor: "pointer" }}>
                    Disconnect
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)", lineHeight: 1.6, marginBottom: "16px" }}>
                Connect Search Console to see keyword rankings, impressions, and click data alongside your SEO audit.
              </p>
              <a
                href={authUrl ?? "#"}
                style={{
                  display: "inline-block",
                  padding: "9px 16px",
                  background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
                  color: "oklch(0.98 0.005 230)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Connect Google Search Console
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Keyword Table */}
      {site.gscConnected && keywords.length > 0 && (
        <KeywordTable keywords={keywords} />
      )}
    </div>
  )
}

function HealthChart({ audits }: { audits: Array<{ id: string; healthScore: number | null; completedAt: Date | null }> }) {
  const scores = audits.map((a) => a.healthScore ?? 0)
  const max = 100
  const width = 280
  const height = 80
  const padX = 8
  const padY = 8
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const points = scores.map((s, i) => {
    const x = padX + (scores.length === 1 ? innerW / 2 : (i / (scores.length - 1)) * innerW)
    const y = padY + innerH - (s / max) * innerH
    return `${x},${y}`
  })

  const latest = scores[scores.length - 1] ?? 0
  const prev   = scores[scores.length - 2]
  const trend  = prev == null ? null : latest - prev

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "28px", fontWeight: 800, color: "oklch(0.92 0.008 230)", fontFamily: "var(--font-mono)" }}>
          {latest}
        </span>
        {trend != null && (
          <span style={{ fontSize: "12px", fontWeight: 600, color: trend >= 0 ? "oklch(0.68 0.16 155)" : "oklch(0.65 0.20 27)" }}>
            {trend >= 0 ? `+${trend}` : trend} since last audit
          </span>
        )}
      </div>
      {scores.length > 1 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="oklch(0.55 0.13 178)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {scores.map((s, i) => {
            const [x, y] = (points[i] ?? "0,0").split(",").map(Number)
            return <circle key={i} cx={x} cy={y} r="3" fill="oklch(0.65 0.13 196)" />
          })}
        </svg>
      )}
    </div>
  )
}

function KeywordTable({ keywords }: { keywords: GscKeywordMetric[] }) {
  return (
    <div style={{
      background: "oklch(0.12 0.008 230 / 0.60)",
      border: "1px solid oklch(0.98 0 0 / 0.06)",
      borderRadius: "14px",
      overflow: "hidden",
    }}>
      <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid oklch(0.98 0 0 / 0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "oklch(0.55 0.13 178)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Top Keywords (28 days)
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Keyword", "Clicks", "Impressions", "Avg Position", "CTR"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", fontSize: "10px", fontWeight: 700, color: "oklch(0.38 0.008 230)", textAlign: h === "Keyword" ? "left" : "right", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid oklch(0.98 0 0 / 0.06)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keywords.map((k) => (
              <tr key={k.id} style={{ borderBottom: "1px solid oklch(0.98 0 0 / 0.04)" }}>
                <td style={{ padding: "10px 16px", fontSize: "13px", color: "oklch(0.85 0.008 230)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {k.keyword}
                </td>
                <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "oklch(0.92 0.008 230)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {k.clicks.toLocaleString()}
                </td>
                <td style={{ padding: "10px 16px", fontSize: "13px", color: "oklch(0.65 0.008 230)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {k.impressions.toLocaleString()}
                </td>
                <td style={{ padding: "10px 16px", fontSize: "13px", color: "oklch(0.65 0.008 230)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  #{Number(k.positionAvg).toFixed(1)}
                </td>
                <td style={{ padding: "10px 16px", fontSize: "13px", color: "oklch(0.65 0.008 230)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {Number(k.ctrPct).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
