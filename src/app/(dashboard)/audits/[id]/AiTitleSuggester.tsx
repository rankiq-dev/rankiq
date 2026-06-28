"use client"
import { useState } from "react"

interface Props {
  auditId: string
  url: string
  currentTitle: string | null
}

export function AiTitleSuggester({ auditId, url, currentTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [copied, setCopied] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchSuggestions() {
    if (suggestions.length > 0) { setOpen(v => !v); return }
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/suggest-titles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json() as { data?: { suggestions: string[] }; error?: string }
      if (data.data?.suggestions) {
        setSuggestions(data.data.suggestions)
      } else {
        setError("Could not generate suggestions. Try again.")
      }
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div style={{ marginTop: "8px" }}>
      <button onClick={fetchSuggestions} style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "4px 10px", fontSize: "10px", fontWeight: 700,
        background: "var(--primary-soft)", color: "var(--primary-2)",
        border: "1px solid oklch(0.55 0.13 178 / 0.3)", borderRadius: "5px",
        cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
      }}>
        ✦ {loading ? "Generating…" : suggestions.length > 0 && open ? "Hide AI titles" : "Suggest titles with AI"}
      </button>

      {open && (
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {currentTitle && (
            <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginBottom: "4px" }}>
              Current: <span style={{ fontFamily: "var(--font-mono)", color: "var(--foreground-2)" }}>{currentTitle}</span>
            </div>
          )}
          {loading && (
            <div style={{ fontSize: "11px", color: "var(--foreground-3)", padding: "8px 0" }}>
              AI is generating title suggestions…
            </div>
          )}
          {error && (
            <div style={{ fontSize: "11px", color: "var(--destructive)" }}>{error}</div>
          )}
          {suggestions.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 12px", background: "oklch(0.14 0.006 230)",
              border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "12px", color: "var(--foreground)" }}>{s}</span>
                <span style={{
                  marginLeft: "8px", fontSize: "10px", fontFamily: "var(--font-mono)",
                  color: s.length > 60 ? "var(--warning)" : "var(--success)",
                }}>{s.length}ch</span>
              </div>
              <button onClick={() => copy(s, i)} style={{
                padding: "3px 8px", fontSize: "10px", fontWeight: 600,
                background: copied === i ? "var(--success-bg)" : "var(--glass-bg)",
                color: copied === i ? "var(--success)" : "var(--foreground-3)",
                border: "1px solid var(--glass-border)", borderRadius: "4px",
                cursor: "pointer", fontFamily: "var(--font-sans), sans-serif", flexShrink: 0,
              }}>
                {copied === i ? "✓ Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
