"use client"
import { useState, useEffect } from "react"

const RELEASE = "v2.6" // bump to show banner again

const FEATURES = [
  "AI title suggestions on audit pages — generate SEO-optimised titles with one click",
  "Fix progress bar — track how many issues you've resolved per audit",
  "Score breakdown chips — see why each page scored the way it did",
  "Recent activity feed on dashboard — jump back to your latest audits",
  "Quick-scan history — recent URLs remembered between sessions",
  "Agency leaderboard — top 3 and worst 3 sites at a glance",
  "Keyword gain alerts — see which keywords climbed 5+ positions",
  "Markdown export for action plans — share with clients as .md",
  "Score distribution histogram — visualise how pages are distributed",
  "Missing meta descriptions bulk list — instantly see all pages needing attention",
]

export function WhatsNew() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("rankiq_whats_new_dismissed")
      if (dismissed !== RELEASE) setVisible(true)
    } catch { /* ignore */ }
  }, [])

  function dismiss() {
    try { localStorage.setItem("rankiq_whats_new_dismissed", RELEASE) } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      background: "linear-gradient(135deg, oklch(0.16 0.04 196 / 0.8), oklch(0.12 0.008 230 / 0.9))",
      border: "1px solid oklch(0.55 0.13 178 / 0.35)",
      borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: "24px",
      position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{
              padding: "2px 8px", background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
              borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: "var(--primary-2)",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>✦ What&apos;s new in {RELEASE}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                fontSize: "11px", color: "var(--foreground-2)",
                background: "oklch(0.14 0.006 230 / 0.6)", border: "1px solid var(--glass-border)",
                borderRadius: "6px", padding: "4px 10px",
              }}>
                {f}
              </div>
            ))}
          </div>
        </div>
        <button onClick={dismiss} style={{
          background: "transparent", border: "none", color: "var(--foreground-3)",
          cursor: "pointer", fontSize: "16px", padding: "0", flexShrink: 0, marginTop: "2px",
          fontFamily: "var(--font-sans), sans-serif",
        }}>✕</button>
      </div>
    </div>
  )
}
