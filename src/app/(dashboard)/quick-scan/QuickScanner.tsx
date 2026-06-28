"use client"
import { useState, useEffect } from "react"

const HISTORY_KEY = "rankiq_quickscan_history"
const MAX_HISTORY = 8

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") } catch { return [] }
}
function saveHistory(url: string) {
  try {
    const h = [url, ...loadHistory().filter(u => u !== url)].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
  } catch { /* ignore */ }
}

interface Issue { type: string; severity: "critical" | "warning" | "info"; message: string }
interface Result {
  url: string
  title: string | null
  metaDescription: string | null
  h1Count: number
  h1Text: string | null
  wordCount: number
  hasCanonical: boolean
  hasJsonLd: boolean
  hasOgTitle: boolean
  hasOgDesc: boolean
  hasOgImage: boolean
  hasTwitterCard: boolean
  imagesMissingAlt: number
  issues: Issue[]
  score: number
}

const SEV_COLOR = { critical: "var(--destructive)", warning: "var(--warning)", info: "var(--info)" }
const SEV_BG = { critical: "var(--destructive-bg)", warning: "var(--warning-bg)", info: "var(--info-bg)" }

export function QuickScanner() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => { setHistory(loadHistory()) }, [])

  async function scan(target?: string) {
    const scanUrl = (target ?? url).trim()
    if (!scanUrl) return
    if (!target) setUrl(scanUrl)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/v1/quick-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl }),
      })
      const data = await res.json() as { data?: Result; error?: string }
      if (data.data) {
        setResult(data.data)
        saveHistory(scanUrl)
        setHistory(loadHistory())
      } else {
        setError(data.error ?? "Scan failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const score = result?.score ?? null
  const scoreColor = score == null ? "var(--foreground-3)" : score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--destructive)"

  return (
    <div>
      {/* URL input */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && scan()}
          placeholder="https://example.com/page"
          style={{
            flex: 1, padding: "11px 16px", fontSize: "13px",
            background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)", color: "var(--foreground)",
            fontFamily: "var(--font-mono), monospace", outline: "none",
          }}
        />
        <button onClick={scan} disabled={loading || !url.trim()} style={{
          padding: "11px 24px", fontSize: "13px", fontWeight: 700,
          background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
          color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
          cursor: loading || !url.trim() ? "default" : "pointer",
          fontFamily: "var(--font-sans), sans-serif",
          opacity: loading || !url.trim() ? 0.6 : 1,
          boxShadow: "var(--shadow-glow)",
        }}>
          {loading ? "Scanning…" : "Scan →"}
        </button>
      </div>

      {/* Recent scan history */}
      {history.length > 0 && !result && !loading && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            Recent scans
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {history.map(h => (
              <button key={h} onClick={() => scan(h)} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "7px 12px", background: "oklch(0.12 0.008 230 / 0.5)",
                border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                cursor: "pointer", fontFamily: "var(--font-mono), monospace",
                fontSize: "11px", color: "var(--foreground-2)", textAlign: "left",
                width: "100%",
              }}>
                <span style={{ color: "var(--foreground-3)", fontSize: "10px" }}>↩</span>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ padding: "12px 16px", background: "var(--destructive-bg)", border: "1px solid oklch(0.65 0.20 27 / 0.3)", borderRadius: "var(--radius-md)", fontSize: "12px", color: "var(--destructive)", marginBottom: "20px" }}>{error}</div>}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Score + URL */}
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px", display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "52px", fontWeight: 900, color: scoreColor, fontFamily: "var(--font-mono)", lineHeight: 1, letterSpacing: "-2px" }}>{score}</div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--foreground-3)", marginTop: "4px" }}>On-page score</div>
            </div>
            <div style={{ flex: 1 }}>
              <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--primary-2)", textDecoration: "none", display: "block", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {result.url}
              </a>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {[
                  { label: "Word count", value: `~${result.wordCount}` },
                  { label: "H1 tags", value: `${result.h1Count}` },
                  { label: "Imgs missing alt", value: `${result.imagesMissingAlt}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SERP Preview */}
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--primary)", marginBottom: "14px" }}>Google SERP Preview</div>
            <div style={{
              background: "oklch(1 0 0)", color: "#202124",
              borderRadius: "8px", padding: "16px 18px", fontFamily: "Arial, sans-serif",
              maxWidth: "600px",
            }}>
              {/* Breadcrumb */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "12px", color: "#202124" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "#4285f4", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" fill="#4285f4"/>
                    <text x="6" y="9" textAnchor="middle" fontSize="8" fill="white" fontFamily="Arial">G</text>
                  </svg>
                </div>
                <span style={{ color: "#202124" }}>{new URL(result.url).hostname}</span>
              </div>
              {/* Title */}
              <div style={{ fontSize: "20px", color: "#1a0dab", lineHeight: 1.3, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {result.title
                  ? result.title.length > 60
                    ? result.title.slice(0, 57) + "…"
                    : result.title
                  : <span style={{ color: "#999" }}>No title tag</span>}
              </div>
              {/* Meta description */}
              <div style={{ fontSize: "14px", color: "#4d5156", lineHeight: 1.57 }}>
                {result.metaDescription
                  ? result.metaDescription.length > 160
                    ? result.metaDescription.slice(0, 157) + "…"
                    : result.metaDescription
                  : <span style={{ color: "#999" }}>No meta description — Google will auto-generate one</span>}
              </div>
              {/* Length warnings */}
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                {result.title && (
                  <span style={{ fontSize: "10px", color: result.title.length > 60 ? "#e65c00" : result.title.length < 30 ? "#f4a800" : "#188038" }}>
                    Title: {result.title.length} chars {result.title.length > 60 ? "(too long)" : result.title.length < 30 ? "(short)" : "(good)"}
                  </span>
                )}
                {result.metaDescription && (
                  <span style={{ fontSize: "10px", color: result.metaDescription.length > 160 ? "#e65c00" : result.metaDescription.length < 70 ? "#f4a800" : "#188038" }}>
                    Description: {result.metaDescription.length} chars {result.metaDescription.length > 160 ? "(too long)" : result.metaDescription.length < 70 ? "(short)" : "(good)"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Signals */}
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--primary)", marginBottom: "14px" }}>Page Signals</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Title", value: result.title ?? "None", ok: !!result.title },
                { label: "Meta description", value: result.metaDescription ?? "None", ok: !!result.metaDescription },
                { label: "H1", value: result.h1Text ?? (result.h1Count === 0 ? "Missing" : "None extracted"), ok: result.h1Count === 1 },
                { label: "Canonical", value: result.hasCanonical ? "Present" : "Missing", ok: result.hasCanonical },
                { label: "JSON-LD Schema", value: result.hasJsonLd ? "Present" : "Missing", ok: result.hasJsonLd },
                { label: "OG Title", value: result.hasOgTitle ? "Present" : "Missing", ok: result.hasOgTitle },
                { label: "OG Image", value: result.hasOgImage ? "Present" : "Missing", ok: result.hasOgImage },
                { label: "Twitter Card", value: result.hasTwitterCard ? "Present" : "Missing", ok: result.hasTwitterCard },
              ].map(({ label, value, ok }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: ok ? "var(--success)" : "var(--destructive)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", fontSize: "8px", color: "white", fontWeight: 900 }}>{ok ? "✓" : "✗"}</span>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground-2)" }}>{label}: </span>
                    <span style={{ fontSize: "11px", color: ok ? "var(--foreground-2)" : "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>{value.length > 80 ? value.slice(0, 80) + "…" : value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--primary)", marginBottom: "12px" }}>
                Issues ({result.issues.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {result.issues.map(issue => (
                  <div key={issue.type} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      padding: "1px 7px", fontSize: "9px", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.08em", borderRadius: "4px",
                      background: SEV_BG[issue.severity], color: SEV_COLOR[issue.severity],
                      flexShrink: 0,
                    }}>{issue.severity}</span>
                    <span style={{ fontSize: "12px", color: "var(--foreground-2)" }}>{issue.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.issues.length === 0 && (
            <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-xl)", padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>🎉</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--success)" }}>No issues found! This page looks great.</div>
            </div>
          )}

          {/* CTA */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={async () => {
              const text = [
                `Quick Scan Report — ${result.url}`,
                `Score: ${result.score}/100`,
                "",
                "Issues:",
                ...result.issues.map(i => `[${i.severity.toUpperCase()}] ${i.message}`),
                result.issues.length === 0 ? "No issues found." : "",
              ].join("\n")
              await navigator.clipboard.writeText(text)
            }} style={{
              padding: "8px 16px", fontSize: "12px", fontWeight: 600,
              background: "var(--glass-bg)", color: "var(--foreground-2)",
              border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
              cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
            }}>Copy results</button>
            <a href="/sites/new" style={{
              padding: "8px 16px", fontSize: "12px", fontWeight: 700,
              background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
              color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
              textDecoration: "none", boxShadow: "var(--shadow-glow)",
            }}>Run full audit →</a>
          </div>
        </div>
      )}
    </div>
  )
}
