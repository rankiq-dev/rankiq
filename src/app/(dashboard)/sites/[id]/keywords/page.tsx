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
  searchParams: Promise<{ q?: string; sort?: string; page?: string; filter?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const { q, sort = "clicks", page: pageParam, filter: kwFilter } = await searchParams

  const site = await getSiteById(id, session.user.id)
  if (!site) notFound()

  const [allKeywords, allMetrics] = await Promise.all([
    getKeywordPositionChanges(id, 200),
    getKeywordMetricsBySite(id, 200),
  ])

  // Performance summary
  const totalClicks = allMetrics.reduce((s, m) => s + m.clicks, 0)
  const totalImpressions = allMetrics.reduce((s, m) => s + m.impressions, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(1) : "0.0"
  const avgPos = allMetrics.length > 0 ? (allMetrics.reduce((s, m) => s + parseFloat(m.positionAvg), 0) / allMetrics.length).toFixed(1) : "—"
  const page1Count = allMetrics.filter(m => parseFloat(m.positionAvg) <= 10).length
  const pos1Count = allKeywords.filter(k => parseFloat(k.positionAvg) < 2).length
  const winRate = allKeywords.length > 0 ? Math.round(pos1Count / allKeywords.length * 100) : 0

  // Compute quick-win opportunities: position 4-20, impressions > 10
  const maxImpressions = Math.max(...allMetrics.map(m => m.impressions), 1)
  const opportunities = allMetrics
    .filter(m => { const p = parseFloat(m.positionAvg); return p > 3 && p <= 20 && m.impressions > 10 })
    .map(m => ({ keyword: m.keyword, position: parseFloat(m.positionAvg), impressions: m.impressions, clicks: m.clicks }))
    .sort((a, b) => (b.impressions / maxImpressions * (1 / a.position)) - (a.impressions / maxImpressions * (1 / b.position)))
    .slice(0, 5)

  // Filter
  const kwFiltered = kwFilter === "drops" ? allKeywords.filter(k => (k.positionChange ?? 0) < -3)
    : kwFilter === "gains" ? allKeywords.filter(k => (k.positionChange ?? 0) > 3)
    : kwFilter === "page1" ? allKeywords.filter(k => parseFloat(k.positionAvg) <= 10)
    : allKeywords
  const filtered = q
    ? kwFiltered.filter(k => k.keyword.toLowerCase().includes(q.toLowerCase()))
    : kwFiltered

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "position") return parseFloat(a.positionAvg) - parseFloat(b.positionAvg)
    if (sort === "impressions") return b.impressions - a.impressions
    if (sort === "ctr") return parseFloat(b.ctrPct) - parseFloat(a.ctrPct)
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
            <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>
              {allKeywords.length} keywords tracked via Google Search Console
              {allKeywords[0]?.dateRangeEnd && (
                <span style={{ fontSize: "11px", color: "var(--foreground-3)", marginLeft: "8px" }}>
                  · Last sync: {new Date(allKeywords[0].dateRangeEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {allKeywords.length > 0 && (
              <a href={`/api/v1/sites/${id}/keywords-export`} download style={{
                padding: "8px 14px", fontSize: "11px", fontWeight: 600,
                background: "var(--glass-bg)", color: "var(--foreground-2)",
                border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", textDecoration: "none",
              }}>↓ CSV</a>
            )}
            {!site.gscConnected && (
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

      {/* Performance summary KPIs */}
      {allMetrics.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "20px" }}>
          {[
            { label: "Total Clicks", value: totalClicks.toLocaleString(), color: "var(--primary-2)" },
            { label: "Total Impressions", value: totalImpressions.toLocaleString(), color: "var(--foreground-2)" },
            { label: "Avg CTR", value: `${avgCtr}%`, color: parseFloat(avgCtr) > 5 ? "var(--success)" : parseFloat(avgCtr) > 2 ? "var(--primary-2)" : "var(--warning)" },
            { label: "Avg Position", value: `#${avgPos}`, color: parseFloat(avgPos) <= 10 ? "var(--success)" : parseFloat(avgPos) <= 20 ? "var(--primary-2)" : "var(--warning)" },
            { label: "Page 1 Keywords", value: page1Count.toString(), color: page1Count > 0 ? "var(--success)" : "var(--foreground-3)" },
            { label: "#1 Win Rate", value: `${winRate}%`, color: winRate >= 10 ? "var(--success)" : winRate >= 3 ? "var(--primary-2)" : "var(--warning)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "12px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
              <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

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
              ? (allKeywords.reduce((s, k) => s + parseFloat(k.positionAvg), 0) / allKeywords.length).toFixed(1)
              : "—"
            const avgCtr = allKeywords.length > 0
              ? (allKeywords.reduce((s, k) => s + parseFloat(k.ctrPct), 0) / allKeywords.length).toFixed(2)
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
          { label: "Top 3", color: "var(--success)", count: allKeywords.filter(k => parseFloat(k.positionAvg) <= 3).length },
          { label: "4–10", color: "var(--primary)", count: allKeywords.filter(k => { const p = parseFloat(k.positionAvg); return p > 3 && p <= 10 }).length },
          { label: "11–20", color: "var(--warning)", count: allKeywords.filter(k => { const p = parseFloat(k.positionAvg); return p > 10 && p <= 20 }).length },
          { label: "21–50", color: "oklch(0.65 0.12 40)", count: allKeywords.filter(k => { const p = parseFloat(k.positionAvg); return p > 20 && p <= 50 }).length },
          { label: "50+", color: "var(--foreground-3)", count: allKeywords.filter(k => parseFloat(k.positionAvg) > 50).length },
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

      {/* Top 3 traffic-driving keywords highlight */}
      {allKeywords.length >= 3 && (() => {
        const top3 = [...allKeywords].sort((a, b) => b.clicks - a.clicks).slice(0, 3)
        const totalClicks = allKeywords.reduce((s, k) => s + k.clicks, 0)
        return (
          <div style={{ background: "oklch(0.14 0.04 196 / 0.2)", border: "1px solid oklch(0.55 0.13 178 / 0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Top traffic drivers
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {top3.map((k, idx) => {
                const pct = totalClicks > 0 ? Math.round(k.clicks / totalClicks * 100) : 0
                return (
                  <div key={k.keyword} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: idx === 0 ? "var(--primary-2)" : "var(--foreground-3)", width: "14px", flexShrink: 0 }}>#{idx + 1}</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.keyword}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--primary-2)", flexShrink: 0 }}>{k.clicks.toLocaleString()} clicks</span>
                    <span style={{ fontSize: "10px", color: "var(--foreground-3)", flexShrink: 0 }}>{pct}% of traffic</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Featured snippet opportunities: positions 1-5 with high impressions */}
      {allKeywords.length > 0 && (() => {
        const snippetCandidates = allKeywords
          .filter(k => { const p = parseFloat(k.positionAvg); return p >= 1 && p <= 5 })
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 3)
        if (snippetCandidates.length === 0) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 155 / 0.25)", border: "1px solid oklch(0.60 0.16 155 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              ★ Featured snippet opportunities — top positions with high visibility
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {snippetCandidates.map(k => (
                <div key={k.keyword} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px" }}>
                  <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{k.keyword}</span>
                  <span style={{ color: "var(--success)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>#{parseFloat(k.positionAvg).toFixed(0)}</span>
                  <span style={{ color: "var(--foreground-3)", fontSize: "10px" }}>{k.impressions.toLocaleString()} impressions</span>
                  <span style={{ color: "var(--foreground-3)", fontSize: "10px", marginLeft: "auto" }}>→ Add FAQ or summary section</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Question-based keywords — good FAQ/featured snippet candidates */}
      {allKeywords.length >= 5 && (() => {
        const QUESTION_WORDS = ["how", "what", "why", "when", "where", "who", "which", "can", "does", "is", "are", "will", "should"]
        const questionKws = allKeywords
          .filter(k => QUESTION_WORDS.some(w => k.keyword.toLowerCase().startsWith(w + " ")))
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 5)
        if (questionKws.length === 0) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 270 / 0.15)", border: "1px solid oklch(0.60 0.10 270 / 0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.72 0.12 270)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              ? Question keywords — add FAQ schema to claim featured snippets
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {questionKws.map(k => (
                <div key={k.keyword} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ fontWeight: 600, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.keyword}</span>
                  <span style={{ color: "var(--foreground-3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>#{parseFloat(k.positionAvg).toFixed(0)}</span>
                  <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{k.impressions.toLocaleString()} impr</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Page 2 opportunity keywords */}
      {allKeywords.length > 0 && (() => {
        const page2 = allKeywords
          .filter(k => { const p = parseFloat(k.positionAvg); return p > 10 && p <= 20 })
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 5)
        if (page2.length === 0) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 196 / 0.3)", border: "1px solid oklch(0.55 0.13 178 / 0.25)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              ⚡ Page 2 opportunities — push to page 1
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {page2.map(k => (
                <div key={k.keyword} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}>
                  <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{k.keyword}</span>
                  <span style={{ color: "var(--warning)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>pos {parseFloat(k.positionAvg).toFixed(0)}</span>
                  <span style={{ color: "var(--foreground-3)", fontSize: "11px" }}>{k.impressions.toLocaleString()} impr/mo</span>
                  <div style={{ flex: 1, height: "3px", background: "oklch(0.20 0.006 230)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${Math.min((k.impressions / (page2[0]!.impressions || 1)) * 100, 100)}%`, background: "var(--primary)", borderRadius: "2px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* CTR gap analysis: keywords ranked 1-5 but underperforming on clicks */}
      {allKeywords.length > 5 && (() => {
        const CTR_BENCHMARKS: Record<number, number> = { 1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.07 }
        const underperforming = allKeywords
          .filter(k => {
            const pos = Math.round(parseFloat(k.positionAvg))
            const bench = CTR_BENCHMARKS[pos]
            if (!bench) return false
            const actualCtr = parseFloat(k.ctrPct) / 100
            return actualCtr < bench * 0.5 && k.impressions >= 50
          })
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 3)
        if (underperforming.length === 0) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 270 / 0.2)", border: "1px solid oklch(0.60 0.12 270 / 0.25)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.70 0.12 270)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              ⟳ CTR gap — ranked but under-clicking (improve meta/title)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {underperforming.map(k => {
                const bench = CTR_BENCHMARKS[Math.round(parseFloat(k.positionAvg))] ?? 0.05
                return (
                  <div key={k.keyword} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.keyword}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--foreground-3)", flexShrink: 0 }}>#{parseFloat(k.positionAvg).toFixed(1)} pos</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--destructive)", flexShrink: 0 }}>{parseFloat(k.ctrPct).toFixed(1)}% CTR</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "oklch(0.70 0.12 270)", flexShrink: 0 }}>vs {(bench * 100).toFixed(0)}% avg</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Zero-click keywords — high impressions but 0 clicks (answer boxes, etc.) */}
      {allKeywords.length >= 5 && (() => {
        const zeroClick = allKeywords
          .filter(k => k.clicks === 0 && k.impressions >= 50)
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 5)
        if (zeroClick.length < 2) return null
        return (
          <div style={{ background: "oklch(0.14 0.04 270 / 0.15)", border: "1px solid oklch(0.60 0.10 270 / 0.2)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.70 0.12 270)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Zero-click keywords — visible but not clicked (likely answer boxes)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {zeroClick.map(k => (
                <div key={k.keyword} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground-2)" }}>{k.keyword}</span>
                  <span style={{ color: "var(--foreground-3)", flexShrink: 0 }}>{k.impressions.toLocaleString()} impr</span>
                  <span style={{ color: "oklch(0.70 0.12 270)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>#{parseFloat(k.positionAvg).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Brand vs non-brand split */}
      {allKeywords.length >= 5 && (() => {
        const domainName = site.domain.replace(/^www\./, "").split(".")[0]?.toLowerCase() ?? ""
        if (!domainName) return null
        const branded = allKeywords.filter(k => k.keyword.toLowerCase().includes(domainName))
        const nonBranded = allKeywords.filter(k => !k.keyword.toLowerCase().includes(domainName))
        if (branded.length === 0) return null
        const brandedClicks = branded.reduce((s, k) => s + k.clicks, 0)
        const nonBrandedClicks = nonBranded.reduce((s, k) => s + k.clicks, 0)
        const total = brandedClicks + nonBrandedClicks
        if (total === 0) return null
        const brandedPct = Math.round(brandedClicks / total * 100)
        return (
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Brand vs non-brand traffic split
            </div>
            <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ flex: brandedPct, background: "var(--primary-2)", minWidth: brandedPct > 0 ? "4px" : 0 }} />
              <div style={{ flex: 100 - brandedPct, background: "var(--success)", minWidth: (100 - brandedPct) > 0 ? "4px" : 0 }} />
            </div>
            <div style={{ display: "flex", gap: "20px", fontSize: "11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--primary-2)", flexShrink: 0 }} />
                <span style={{ color: "var(--foreground-2)" }}>Brand: <strong style={{ color: "var(--primary-2)" }}>{brandedPct}%</strong> · {branded.length} kw · {brandedClicks.toLocaleString()} clicks</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--success)", flexShrink: 0 }} />
                <span style={{ color: "var(--foreground-2)" }}>Non-brand: <strong style={{ color: "var(--success)" }}>{100 - brandedPct}%</strong> · {nonBranded.length} kw · {nonBrandedClicks.toLocaleString()} clicks</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Keyword clusters — group keywords sharing the same first two words */}
      {allKeywords.length >= 10 && (() => {
        const clusters: Record<string, typeof allKeywords> = {}
        for (const k of allKeywords) {
          const parts = k.keyword.toLowerCase().split(" ")
          const root = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0] ?? k.keyword
          if (!clusters[root]) clusters[root] = []
          clusters[root]!.push(k)
        }
        const topClusters = Object.entries(clusters)
          .filter(([, kws]) => kws.length >= 2)
          .sort((a, b) => b[1].reduce((s, k) => s + k.impressions, 0) - a[1].reduce((s, k) => s + k.impressions, 0))
          .slice(0, 4)
        if (topClusters.length === 0) return null
        return (
          <div style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Keyword clusters — groups of related terms
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
              {topClusters.map(([root, kws]) => (
                <div key={root} style={{ background: "oklch(0.13 0.008 230 / 0.6)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary-2)", marginBottom: "6px", textTransform: "capitalize" }}>{root}…</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {kws.slice(0, 3).map(k => (
                      <div key={k.keyword} style={{ fontSize: "10px", color: "var(--foreground-2)", display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{k.keyword}</span>
                        <span style={{ color: "var(--foreground-3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>#{parseFloat(k.positionAvg).toFixed(0)}</span>
                      </div>
                    ))}
                    {kws.length > 3 && <div style={{ fontSize: "10px", color: "var(--foreground-3)" }}>+{kws.length - 3} more</div>}
                  </div>
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

          {/* Intent breakdown */}
          {allKeywords.length >= 10 && (() => {
            const infoPrefixes = ["how", "what", "why", "who", "when", "where", "which", "guide", "tutorial", "tips", "learn", "vs", "difference"]
            const transPrefixes = ["buy", "price", "cost", "cheap", "best", "review", "hire", "service", "near me", "order", "discount", "deal", "promo"]
            let info = 0, trans = 0, nav = 0
            for (const kw of allKeywords) {
              const q = kw.keyword.toLowerCase()
              if (transPrefixes.some(p => q.includes(p))) trans++
              else if (infoPrefixes.some(p => q.startsWith(p) || q.includes(` ${p} `))) info++
              else nav++
            }
            const total = allKeywords.length
            return (
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                {[
                  { label: "Informational", count: info, color: "var(--primary-2)" },
                  { label: "Transactional", count: trans, color: "var(--success)" },
                  { label: "Navigational", count: nav, color: "var(--foreground-3)" },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ padding: "6px 12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>{count}</div>
                    <div style={{ fontSize: "9px", color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                    <div style={{ fontSize: "9px", color: "var(--foreground-3)" }}>{Math.round(count / total * 100)}%</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
            {[
              { label: "All", value: undefined },
              { label: "↓ Drops", value: "drops" },
              { label: "↑ Gains", value: "gains" },
              { label: "Page 1", value: "page1" },
            ].map(({ label, value }) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link key={label} href={value ? `/sites/${id}/keywords?filter=${value}${q ? `&q=${q}` : ""}&sort=${sort}` : `/sites/${id}/keywords?sort=${sort}` as any} style={{
                padding: "4px 12px", fontSize: "11px", fontWeight: 600,
                background: kwFilter === value ? "var(--glass-bg)" : "transparent",
                border: `1px solid ${kwFilter === value ? "oklch(0.55 0.13 178 / 0.4)" : "var(--glass-border)"}`,
                borderRadius: "20px", textDecoration: "none",
                color: kwFilter === value ? "var(--primary-2)" : "var(--foreground-3)",
              }}>{label}</Link>
            ))}
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
                    { label: "Est. Value", key: "value", align: "right" },
                    { label: "Opp. Score", key: "opp", align: "right" },
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
                  const pos = parseFloat(kw.positionAvg)
                  const change = kw.positionChange
                  return (
                    <tr key={kw.id} style={{ borderBottom: i < paginated.length - 1 ? "1px solid oklch(0.98 0 0 / 0.04)" : "none" }}>
                      <td style={{ padding: "10px 20px", fontSize: "13px", color: "var(--foreground)", maxWidth: "300px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kw.keyword}</div>
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "13px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: posColor(kw.positionAvg) }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          {pos.toFixed(1)}
                          {pos <= 10 && (
                            <span style={{
                              fontSize: "8px", fontWeight: 800, padding: "1px 5px", borderRadius: "3px",
                              background: pos <= 3 ? "oklch(0.68 0.16 155 / 0.2)" : "oklch(0.55 0.13 178 / 0.15)",
                              color: pos <= 3 ? "var(--success)" : "var(--primary-2)",
                              border: `1px solid ${pos <= 3 ? "oklch(0.68 0.16 155 / 0.3)" : "oklch(0.55 0.13 178 / 0.25)"}`,
                              textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-sans), sans-serif",
                            }}>
                              {pos <= 3 ? "Top 3" : "Pg 1"}
                            </span>
                          )}
                        </span>
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
                      <td style={{ padding: "10px 20px", fontSize: "12px", textAlign: "right" }}>
                        {(() => {
                          const ctrPct = parseFloat(kw.ctrPct)
                          const actualCtrRatio = ctrPct / 100
                          const benchmark = pos <= 1 ? 0.28 : pos <= 2 ? 0.15 : pos <= 3 ? 0.11 : pos <= 4 ? 0.08 : pos <= 5 ? 0.07 : pos <= 10 ? 0.04 : 0.015
                          const isAbove = actualCtrRatio >= benchmark
                          return (
                            <span title={`Industry avg at pos ${pos.toFixed(0)}: ${(benchmark * 100).toFixed(1)}%`} style={{ color: isAbove ? "var(--success)" : "var(--foreground-3)" }}>
                              {ctrPct.toFixed(1)}%
                              {pos > 0 && <span style={{ fontSize: "9px", marginLeft: "3px" }}>{isAbove ? "↑" : "↓"}</span>}
                            </span>
                          )
                        })()}
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "11px", textAlign: "right", color: "var(--foreground-3)" }}>
                        <span title="Estimated monthly value (clicks × $1.50 avg CPC proxy)">
                          ${(kw.clicks * 1.5).toFixed(0)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: "11px", textAlign: "right" }}>
                        {(() => {
                          const oppScore = kw.impressions > 0 && pos > 0 ? Math.round(Math.min(100, (kw.impressions / Math.max(kw.clicks, 1)) * (pos / 10) * 10)) : 0
                          const oppColor = oppScore >= 70 ? "var(--success)" : oppScore >= 40 ? "var(--warning)" : "var(--foreground-3)"
                          return <span style={{ color: oppColor, fontWeight: oppScore >= 70 ? 700 : 400 }} title="Opportunity score: high impressions + poor CTR = high potential">{oppScore > 0 ? oppScore : "—"}</span>
                        })()}
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
