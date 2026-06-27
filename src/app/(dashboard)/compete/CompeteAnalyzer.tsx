"use client"
import { useState } from "react"

interface SiteData {
  url: string
  title: string | null
  description: string | null
  h1: string | null
  h1Count: number
  wordCount: number
  internalLinks: number
  externalLinks: number
  hasSchema: boolean
  canonical: string | null
  score: number
  issues: string[]
}

interface CompareResult {
  your: SiteData
  competitor: SiteData
  insights: string[]
}

export function CompeteAnalyzer() {
  const [yourDomain, setYourDomain] = useState("")
  const [compDomain, setCompDomain] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyze(e: React.FormEvent) {
    e.preventDefault()
    if (!yourDomain || !compDomain) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/v1/compete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yourDomain: yourDomain.trim(), compDomain: compDomain.trim() }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? "Analysis failed. Please try again.")
        return
      }
      const data = await res.json() as CompareResult
      setResult(data)
    } catch {
      setError("Network error. Please check the domains and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Input form */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "24px 28px", marginBottom: "24px",
      }}>
        <form onSubmit={analyze}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: "12px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px" }}>
                Your Site
              </label>
              <input
                value={yourDomain}
                onChange={e => setYourDomain(e.target.value)}
                placeholder="yoursite.com"
                required
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)" }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--glass-border)" }}
              />
            </div>
            <div style={{ fontSize: "18px", color: "var(--foreground-3)", paddingBottom: "2px", fontWeight: 300 }}>vs</div>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px" }}>
                Competitor
              </label>
              <input
                value={compDomain}
                onChange={e => setCompDomain(e.target.value)}
                placeholder="competitor.com"
                required
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)" }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--glass-border)" }}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: "11px 24px", fontSize: "13px", fontWeight: 700,
              background: loading ? "oklch(0.28 0.06 178)" : "linear-gradient(135deg, var(--primary), var(--primary-2))",
              color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans), sans-serif",
              boxShadow: loading ? "none" : "var(--shadow-glow)",
              whiteSpace: "nowrap",
            }}>
              {loading ? "Analysing…" : "Analyse →"}
            </button>
          </div>
        </form>
        {error && (
          <div style={{ marginTop: "14px", padding: "10px 14px", background: "var(--destructive-bg)", border: "1px solid oklch(0.65 0.20 27 / 0.3)", borderRadius: "var(--radius)", fontSize: "13px", color: "var(--destructive)" }}>
            {error}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "56px", textAlign: "center",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "14px" }}>◎</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", marginBottom: "6px" }}>Crawling both sites…</div>
          <div style={{ fontSize: "13px", color: "var(--foreground-2)" }}>This takes 15–30 seconds. Fetching homepage SEO data.</div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* AI Insights */}
          {result.insights.length > 0 && (
            <div style={{
              background: "var(--primary-soft)", backdropFilter: "blur(20px)",
              border: "1px solid oklch(0.55 0.13 178 / 0.3)", borderRadius: "var(--radius-xl)",
              padding: "20px 24px",
            }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                ✦ Key Insights
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {result.insights.map((insight, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "var(--foreground)", lineHeight: 1.55 }}>
                    <span style={{ color: "var(--primary-2)", flexShrink: 0 }}>→</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-side comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <SiteCard data={result.your} label="Your Site" />
            <SiteCard data={result.competitor} label="Competitor" />
          </div>

          {/* Detailed metric comparison */}
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Signal Comparison
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Signal", result.your.url, result.competitor.url, "Edge"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 16px", fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textAlign: i === 0 ? "left" : "center", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--glass-border)" }}>
                      {i === 0 ? h : (h as string).replace(/^https?:\/\//, "").slice(0, 25)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Title tag", yours: result.your.title ? "✓ Present" : "✗ Missing", theirs: result.competitor.title ? "✓ Present" : "✗ Missing", edge: !!result.your.title && !result.competitor.title ? "you" : !result.your.title && !!result.competitor.title ? "them" : "tie" },
                  { label: "Meta description", yours: result.your.description ? "✓ Present" : "✗ Missing", theirs: result.competitor.description ? "✓ Present" : "✗ Missing", edge: !!result.your.description && !result.competitor.description ? "you" : !result.your.description && !!result.competitor.description ? "them" : "tie" },
                  { label: "H1 tag", yours: result.your.h1Count === 1 ? "✓ Single H1" : result.your.h1Count === 0 ? "✗ Missing" : `⚠ ${result.your.h1Count} H1s`, theirs: result.competitor.h1Count === 1 ? "✓ Single H1" : result.competitor.h1Count === 0 ? "✗ Missing" : `⚠ ${result.competitor.h1Count} H1s`, edge: result.your.h1Count === 1 && result.competitor.h1Count !== 1 ? "you" : result.competitor.h1Count === 1 && result.your.h1Count !== 1 ? "them" : "tie" },
                  { label: "Word count", yours: `${result.your.wordCount.toLocaleString()} words`, theirs: `${result.competitor.wordCount.toLocaleString()} words`, edge: result.your.wordCount > result.competitor.wordCount ? "you" : result.competitor.wordCount > result.your.wordCount ? "them" : "tie" },
                  { label: "Schema markup", yours: result.your.hasSchema ? "✓ Yes" : "✗ No", theirs: result.competitor.hasSchema ? "✓ Yes" : "✗ No", edge: result.your.hasSchema && !result.competitor.hasSchema ? "you" : !result.your.hasSchema && result.competitor.hasSchema ? "them" : "tie" },
                  { label: "Internal links", yours: `${result.your.internalLinks}`, theirs: `${result.competitor.internalLinks}`, edge: result.your.internalLinks > result.competitor.internalLinks ? "you" : result.competitor.internalLinks > result.your.internalLinks ? "them" : "tie" },
                  { label: "Canonical tag", yours: result.your.canonical ? "✓ Set" : "✗ Missing", theirs: result.competitor.canonical ? "✓ Set" : "✗ Missing", edge: !!result.your.canonical && !result.competitor.canonical ? "you" : !result.your.canonical && !!result.competitor.canonical ? "them" : "tie" },
                  { label: "On-page score", yours: `${result.your.score}/100`, theirs: `${result.competitor.score}/100`, edge: result.your.score > result.competitor.score ? "you" : result.competitor.score > result.your.score ? "them" : "tie" },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "11px 16px", fontSize: "12px", color: "var(--foreground-2)", fontWeight: 500 }}>{row.label}</td>
                    <td style={{ padding: "11px 16px", fontSize: "12px", color: row.edge === "you" ? "var(--success)" : row.yours.startsWith("✗") ? "var(--destructive)" : row.yours.startsWith("⚠") ? "var(--warning)" : "var(--foreground)", textAlign: "center", fontFamily: "var(--font-mono)" }}>{row.yours}</td>
                    <td style={{ padding: "11px 16px", fontSize: "12px", color: row.edge === "them" ? "var(--success)" : row.theirs.startsWith("✗") ? "var(--destructive)" : row.theirs.startsWith("⚠") ? "var(--warning)" : "var(--foreground)", textAlign: "center", fontFamily: "var(--font-mono)" }}>{row.theirs}</td>
                    <td style={{ padding: "11px 16px", textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                        background: row.edge === "you" ? "var(--success-bg)" : row.edge === "them" ? "var(--destructive-bg)" : "var(--glass-bg)",
                        color: row.edge === "you" ? "var(--success)" : row.edge === "them" ? "var(--destructive)" : "var(--foreground-3)",
                      }}>
                        {row.edge === "you" ? "You win" : row.edge === "them" ? "Them" : "Tie"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SiteCard({ data, label }: { data: SiteData; label: string }) {
  const scoreColor = data.score >= 80 ? "var(--success)" : data.score >= 60 ? "var(--primary-2)" : data.score >= 40 ? "var(--warning)" : "var(--destructive)"

  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "20px 22px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${scoreColor}, transparent)` }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>{label}</div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground-2)" }}>{data.url.replace(/^https?:\/\//, "").slice(0, 30)}</div>
        </div>
        <div style={{ fontSize: "32px", fontWeight: 900, color: scoreColor, fontFamily: "var(--font-mono)", filter: `drop-shadow(0 0 8px ${scoreColor})` }}>{data.score}</div>
      </div>
      {data.title && <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.title}</div>}
      {data.description && <div style={{ fontSize: "11px", color: "var(--foreground-3)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{data.description}</div>}
      {data.issues.length > 0 && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {data.issues.slice(0, 3).map((issue, i) => (
            <div key={i} style={{ fontSize: "11px", color: "var(--destructive)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚠</span><span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--foreground)",
  fontSize: "14px",
  fontFamily: "var(--font-mono), monospace",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms",
}
