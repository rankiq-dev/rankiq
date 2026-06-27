export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordPositionChanges, getKeywordMetricsBySite } from "@/db/repositories/gsc"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Keywords" }

export default async function KeywordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const { q, sort = "clicks", page: pageParam } = await searchParams

  const site = await getSiteById(id, session.user.id)
  if (!site) notFound()

  const [allKeywords, allMetrics] = await Promise.all([
    getKeywordPositionChanges(id, 200),
    getKeywordMetricsBySite(id, 200),
  ])

  // Compute quick-win opportunities: position 4-20, impressions > 10
  const maxImpressions = Math.max(...allMetrics.map(m => m.impressions), 1)
  const opportunities = allMetrics
    .filter(m => { const p = parseFloat(m.positionAvg); return p > 3 && p <= 20 && m.impressions > 10 })
    .map(m => ({ keyword: m.keyword, position: parseFloat(m.positionAvg), impressions: m.impressions, clicks: m.clicks }))
    .sort((a, b) => (b.impressions / maxImpressions * (1 / a.position)) - (a.impressions / maxImpressions * (1 / b.position)))
    .slice(0, 5)

  // Filter
  const filtered = q
    ? allKeywords.filter(k => k.query.toLowerCase().includes(q.toLowerCase()))
    : allKeywords

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "position") return parseFloat(a.position) - parseFloat(b.position)
    if (sort === "impressions") return b.impressions - a.impressions
    if (sort === "ctr") return parseFloat(b.ctr) - parseFloat(a.ctr)
    if (sort === "change") return (b.positionChange ?? 0) - (a.positionChange ?? 0)
    return b.clicks - a.clicks // default: clicks
  })

  // Paginate
  const PER_PAGE = 25
  const currentPage = Math.max(1, parseInt(pageParam ?? "1"))
  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const paginated = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  const posColor = (pos: string) => {
    const p = parseFloat(pos)
    return p <= 3 ? "var(--success)" : p <= 10 ? "var(--primary-2)" : p <= 20 ? "var(--warning)" : "var(--foreground-3)"
  }

  function sortLink(s: string) {
    const params = new URLSearchParams({ ...(q ? { q } : {}), sort: s, page: "1" })
    return `/sites/${id}/keywords?${params}`
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <Link href={`/sites/${id}`} style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", display: "inline-block", marginBottom: "10px" }}>
          ← Back to {site.domain}
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.5px", marginBottom: "4px" }}>Keywords</h1>
            <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>{allKeywords.length} keywords tracked via Google Search Console</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {allKeywords.length > 0 && (
              <a href={`/api/v1/sites/${id}/keywords-export`} download style={{
                padding: "8px 14px", fontSize: "11px", fontWeight: 600,
                background: "var(--glass-bg)", color: "var(--foreground-2)",
                border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", textDecoration: "none",
              }}>↓ CSV</a>
            )}
            {!site.gscSiteUrl && (
              <Link href={`/sites/${id}`} style={{
                padding: "8px 16px", fontSize: "12px", fontWeight: 700,
                background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
                color: "var(--primary-foreground)", borderRadius: "var(--radius-md)", textDecoration: "none",
                boxShadow: "var(--shadow-glow)",
              }}>Connect GSC →</Link>
            )}
          </div>
        </div>
      </div>

      {opportunities.length > 0 && (
        <div style={{ background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.25)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "20px" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>✦ Quick-Win Opportunities — high impressions, not yet page 1</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {opportunities.map(o => (
              <div key={o.keyword} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.keyword}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--warning)", fontWeight: 700, flexShrink: 0 }}>#{o.position.toFixed(1)}</span>
                <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{o.impressions.toLocaleString()} impr</span>
                <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{o.clicks} clicks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allKeywords.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {(() => {
            const totalClicks = allKeywords.reduce((s, k) => s + k.clicks, 0)
            const totalImpressions = allKeywords.reduce((s, k) => s + k.impressions, 0)
            const avgPosition = allKeywords.length > 0
              ? (allKeywords.reduce((s, k) => s + parseFloat(k.position), 0) / allKeywords.length).toFixed(1)
              : "—"
            const avgCtr = allKeywords.length > 0
              ? ((allKeywords.reduce((s, k) => s + parseFloat(k.ctr), 0) / allKeywords.length) * 100).toFixed(2)
              : "—"
            return [
              { label: "Total Clicks", value: totalClicks.toLocaleString(), color: "var(--primary-2)" },
              { label: "Total Impressions", value: totalImpressions.toLocaleString(), color: "var(--info)" },
              { label: "Avg Position", value: avgPosition, color: "var(--warning)" },
              { label: "Avg CTR", value: `${avgCtr}%`, color: "var(--success)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
                <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{value}</div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Position distribution bar */}
      {allKeywords.length > 0 && (() => {
        const buckets = [
          { label: "Top 3", color: "var(--success)", count: allKeywords.filter(k => parseFloat(k.position) <= 3).length },
          { label: "4–10", color: "var(--primary)", count: allKeywords.filter(k => { const p = parseFloat(k.position); return p > 3 && p <= 10 }).length },
          { label: "11–20", color: "var(--warning)", count: allKeywords.filter(k => { const p = parseFloat(k.position); return p > 10 && p <= 20 }).length },
          { label: "21–50", color: "oklch(0.65 0.12 40)", count: allKeywords.filter(k => { const p = parseFloat(k.position); return p > 20 && p <= 50 }).length },
          { label: "50+", color: "var(--foreground-3)", count: allKeywords.filter(k => parseFloat(k.position) > 50).length },
        ]
        const total = allKeywords.length
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "20px" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Position Distribution</div>
            <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", gap: "2px", marginBottom: "8px" }}>
              {buckets.map(b => b.count > 0 && (
                <div key={b.label} style={{ flex: b.count, background: b.color, minWidth: "4px", borderRadius: "2px" }} title={`${b.label}: ${b.count}`} />
              ))}
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              {buckets.map(b => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--foreground-3)" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "1px", background: b.color, flexShrink: 0 }} />
                  <span style={{ color: b.color, fontWeight: 700 }}>{b.count}</span>
                  <span>{b.label} ({total > 0 ? Math.round(b.count / total * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {allKeywords.length === 0 ? (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "60px 40px", textAlign: "center",
        }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⬡</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>No keyword data yet</div>
          <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.6 }}>
            Connect Google Search Console from the site overview page to start tracking keywords.
          </p>
        </div>
      ) : (
        <>
          {/* Search + filter bar */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <form method="get" action={`/sites/${id}/keywords`} style={{ flex: 1 }}>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Filter keywords…"
                style={{
                  width: "100%", padding: "9px 14px", fontSize: "13px",
                  background: "var(--glass-bg)", backdropFilter: "blur(12px)",
                  border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                  color: "var(--foreground)", fontFamily: "var(--font-sans), sans-serif",
                  outline: "none",
                }}
              />
              <input type="hidden" name="sort" value={sort} />
            </form>
          </div>

          {/* Table */}
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            overflow: "hidden", marginBottom: "16px",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  {[
                    { label: "Query", key: "query", align: "left" },
                    { label: "Position", key: "position", align: "right" },
                    { label: "Change", key: "change", align: "right" },
                    { label: "Clicks", key: "clicks", align: "right" },
                    { label: "Impressions", key: "impressions", align: "right" },
                    { label: "CTR", key: "ctr", align: "right" },
                  ].map(col => (
                    <th key={col.key} style={{
                      padding: "10px 20px", textAlign: col.align as "left" | "right",
                      fontSize: "10px", fontWeight: 700, color: sort === col.key ? "var(--primary)" : "var(--foreground-3)",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {col.key === "query" ? col.label : (
                        <Link href={sortLink(col.key)} style={{ color: "inherit", textDecoration: "none" }}>
                          {col.label} {sort === col.key && "↓"}
                        </Link>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((kw, i) => {
                  const pos = parseFloat(kw.position)
                  const change = kw.positionChange
                  return (
                    <tr key={kw.id} style={{ borderBottom: i < paginated.length - 1 ? "1px solid oklch(0.98 0 0 / 0.04)" : "none" }}>
                      <td style={{ padding: "10px 20px", fontSize: "13px", color: "var(--foreground)", maxWidth: "300px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kw.query}</div>
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "13px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: posColor(kw.position) }}>
                        {pos.toFixed(1)}
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "12px", textAlign: "right", fontWeight: 700 }}>
                        {change == null ? (
                          <span style={{ color: "var(--foreground-3)" }}>—</span>
                        ) : change > 0 ? (
                          <span style={{ color: "var(--success)" }}>↑ {change}</span>
                        ) : change < 0 ? (
                          <span style={{ color: "var(--destructive)" }}>↓ {Math.abs(change)}</span>
                        ) : (
                          <span style={{ color: "var(--foreground-3)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "13px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>
                        {kw.clicks.toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "13px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--foreground-2)" }}>
                        {kw.impressions.toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "12px", textAlign: "right", color: "var(--foreground-3)" }}>
                        {(parseFloat(kw.ctr) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--foreground-3)" }}>
                Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, sorted.length)} of {sorted.length}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {currentPage > 1 && (
                  <Link href={`/sites/${id}/keywords?${new URLSearchParams({ ...(q ? { q } : {}), sort, page: String(currentPage - 1) })}`}
                    style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", color: "var(--foreground-2)", textDecoration: "none" }}>
                    ← Prev
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link href={`/sites/${id}/keywords?${new URLSearchParams({ ...(q ? { q } : {}), sort, page: String(currentPage + 1) })}`}
                    style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", color: "var(--foreground-2)", textDecoration: "none" }}>
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
