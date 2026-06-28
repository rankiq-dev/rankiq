"use client"
import { useState, useEffect } from "react"

const RELEASE = "v3.1" // bump to show banner again

const FEATURES = [
  "Score projection — see your predicted score after fixing top issues",
  "Priority matrix — severity × fix time 2×2 grid for triage",
  "'What to fix this week' — your top 5 ranked by impact",
  "Issue trend — how many new vs resolved vs previous audit",
  "Content cluster map — pages grouped by URL prefix",
  "Indexability report — indexable, noindex, canonical, schema at a glance",
  "Crawl depth column — URL segment depth per page",
  "Orphan revenue alert — equity not reaching your best content",
  "Plan usage bar — sites used vs plan limit in header",
  "Agency health filter — filter portfolio by score range",
  "Onboarding checklist — step-by-step setup guide for new users",
  "'Won't fix' toggle — dismiss issues you'll never act on",
  "Page 2 keyword opportunities — keywords one push from page 1",
  "Featured snippet panel — top-ranked keywords primed for position 0",
  "Keyword CTR benchmarks — green/red vs industry average by position",
  "All-issues-resolved celebration screen",
  "Back to top button on all long pages",
  "Duplicate title tag detection — find pages competing with themselves",
  "Keyword filter tabs — show drops, gains, or page 1 keywords only",
  "Content pillars panel — your deepest, most-linked content at a glance",
  "H1 diversity score — % of pages with unique headings",
  "Badge JSON API — embed site health in any external tool or dashboard",
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
