"use client"
import { useState } from "react"

interface Brief {
  recommendedTitle: string
  recommendedH1: string
  targetWordCount: number
  primaryKeyword: string
  secondaryKeywords: string[]
  recommendedH2s: string[]
  contentGaps: string[]
  schemaType: string | null
  priorityFixes: string[]
}

interface Props {
  auditId: string
  url: string
  path: string
  currentScore: number
  currentWordCount: number
}

export function ContentBriefClient({ auditId, url, path, currentScore, currentWordCount }: Props) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/content-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const json = await res.json() as { data?: { brief: Brief }; error?: string }
      if (json.data?.brief) {
        setBrief(json.data.brief)
      } else {
        setError(json.error ?? "Failed to generate brief")
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  const card = (children: React.ReactNode) => (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "20px 24px", marginBottom: "16px",
    }}>{children}</div>
  )

  const label = (text: string) => (
    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
      {text}
    </div>
  )

  return (
    <div>
      {/* Current page summary */}
      {card(
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginBottom: "2px" }}>URL</div>
            <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground-2)" }}>{path}</div>
          </div>
          <div>
            <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginBottom: "2px" }}>On-page score</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: currentScore < 60 ? "var(--destructive)" : currentScore < 75 ? "var(--warning)" : "var(--success)", fontFamily: "var(--font-mono)" }}>{currentScore}</div>
          </div>
          <div>
            <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginBottom: "2px" }}>Word count</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{currentWordCount.toLocaleString()}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <button
              onClick={generate}
              disabled={loading}
              style={{
                padding: "10px 22px", fontSize: "13px", fontWeight: 700,
                background: loading ? "oklch(0.35 0.08 178)" : "linear-gradient(135deg, var(--primary), var(--primary-2))",
                color: "white", border: "none", borderRadius: "var(--radius-md)",
                cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-sans), sans-serif",
                boxShadow: loading ? "none" : "var(--shadow-glow)",
              }}
            >
              {loading ? "Generating…" : brief ? "Regenerate Brief" : "✦ Generate AI Content Brief"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", background: "oklch(0.55 0.18 25 / 0.10)", border: "1px solid oklch(0.55 0.18 25 / 0.30)", borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: "oklch(0.75 0.18 25)" }}>
          {error}
        </div>
      )}

      {brief && (
        <div>
          {card(
            <>
              {label("Recommended Title")}
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>
                {brief.recommendedTitle}
              </div>
              {label("Recommended H1")}
              <div style={{ fontSize: "14px", color: "var(--foreground-2)" }}>{brief.recommendedH1}</div>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {card(
              <>
                {label("Target Word Count")}
                <div style={{ fontSize: "28px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--primary-2)" }}>
                  {brief.targetWordCount.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "4px" }}>
                  +{Math.max(0, brief.targetWordCount - currentWordCount)} words to add
                </div>
              </>
            )}
            {card(
              <>
                {label("Primary Keyword")}
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>{brief.primaryKeyword}</div>
                {label("Secondary Keywords")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {brief.secondaryKeywords.map(k => (
                    <span key={k} style={{ padding: "2px 8px", background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.2)", borderRadius: "4px", fontSize: "11px", color: "var(--primary-2)" }}>{k}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {card(
            <>
              {label("Recommended H2 Structure")}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {brief.recommendedH2s.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", paddingTop: "2px", minWidth: "20px" }}>H2</span>
                    <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 600 }}>{h}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {card(
              <>
                {label("Content Gaps to Fill")}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {brief.contentGaps.map((gap, i) => (
                    <div key={i} style={{ fontSize: "12px", color: "var(--foreground-2)", display: "flex", gap: "8px" }}>
                      <span style={{ color: "var(--warning)" }}>◎</span>{gap}
                    </div>
                  ))}
                </div>
              </>
            )}
            {card(
              <>
                {label("Priority Fixes")}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {brief.priorityFixes.map((fix, i) => (
                    <div key={i} style={{ fontSize: "12px", color: "var(--foreground-2)", display: "flex", gap: "8px" }}>
                      <span style={{ color: "var(--primary-2)" }}>{i + 1}.</span>{fix}
                    </div>
                  ))}
                </div>
                {brief.schemaType && (
                  <div style={{ marginTop: "12px", padding: "8px 12px", background: "oklch(0.55 0.13 178 / 0.08)", borderRadius: "6px", fontSize: "11px", color: "var(--primary-2)" }}>
                    💡 Add <strong>{brief.schemaType}</strong> schema markup to this page
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
