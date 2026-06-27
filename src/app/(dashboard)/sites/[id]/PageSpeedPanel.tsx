"use client"
import { useState } from "react"

interface Metrics {
  score: number | null
  fcp: number | null
  lcp: number | null
  cls: number | null
  fid: number | null
  ttfb: number | null
  si: number | null
}

interface Result {
  strategy: string
  url: string
  metrics: Metrics
}

export function PageSpeedPanel({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile")

  async function check(strat: "mobile" | "desktop") {
    setLoading(true)
    setError(null)
    setResult(null)
    setStrategy(strat)
    try {
      const res = await fetch(`/api/v1/sites/${siteId}/pagespeed?strategy=${strat}`)
      const data = await res.json() as { data?: Result; error?: string }
      if (data.data) setResult(data.data)
      else setError(data.error ?? "Check failed")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const score = result?.metrics.score ?? null
  const scoreColor = score == null ? "var(--foreground-3)" : score >= 90 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--destructive)"

  function ms(v: number | null) { return v == null ? "—" : `${(v / 1000).toFixed(2)}s` }
  function raw(v: number | null, digits = 2) { return v == null ? "—" : v.toFixed(digits) }

  const vitals = result ? [
    { label: "FCP", value: ms(result.metrics.fcp), good: result.metrics.fcp != null && result.metrics.fcp < 1800 },
    { label: "LCP", value: ms(result.metrics.lcp), good: result.metrics.lcp != null && result.metrics.lcp < 2500 },
    { label: "CLS", value: raw(result.metrics.cls, 3), good: result.metrics.cls != null && result.metrics.cls < 0.1 },
    { label: "TBT", value: ms(result.metrics.fid), good: result.metrics.fid != null && result.metrics.fid < 200 },
    { label: "TTFB", value: ms(result.metrics.ttfb), good: result.metrics.ttfb != null && result.metrics.ttfb < 800 },
    { label: "SI", value: ms(result.metrics.si), good: result.metrics.si != null && result.metrics.si < 3400 },
  ] : []

  return (
    <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)", marginBottom: "2px" }}>Page Speed</h3>
          <p style={{ fontSize: "11px", color: "var(--foreground-3)" }}>Google PageSpeed Insights</p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["mobile", "desktop"] as const).map(s => (
            <button key={s} onClick={() => check(s)} disabled={loading} style={{
              padding: "5px 12px", fontSize: "11px", fontWeight: 700,
              background: "var(--primary-soft)", color: "var(--primary-2)",
              border: "1px solid oklch(0.55 0.13 178 / 0.3)", borderRadius: "var(--radius-md)",
              cursor: loading ? "default" : "pointer", fontFamily: "var(--font-sans), sans-serif",
              opacity: loading && strategy === s ? 0.5 : 1, textTransform: "capitalize",
            }}>
              {loading && strategy === s ? "Checking…" : s}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ fontSize: "12px", color: "var(--destructive)" }}>{error}</div>}

      {result && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "44px", fontWeight: 900, color: scoreColor, fontFamily: "var(--font-mono)", letterSpacing: "-2px", lineHeight: 1 }}>
              {score ?? "—"}
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: scoreColor }}>{score != null ? (score >= 90 ? "Good" : score >= 50 ? "Needs improvement" : "Poor") : ""}</div>
              <div style={{ fontSize: "10px", color: "var(--foreground-3)", textTransform: "capitalize" }}>{result.strategy} · {result.url}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {vitals.map(({ label, value, good }) => (
              <div key={label} style={{
                padding: "8px 10px", background: "oklch(0.13 0.006 230)",
                borderRadius: "var(--radius)", border: `1px solid ${good ? "var(--success)" : "oklch(0.65 0.20 27 / 0.3)"}`,
              }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: good ? "var(--success)" : "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <p style={{ fontSize: "11px", color: "var(--foreground-3)" }}>
          Run a check to see Core Web Vitals (FCP, LCP, CLS, TBT, TTFB)
        </p>
      )}
    </div>
  )
}
