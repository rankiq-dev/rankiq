"use client"
import { useState } from "react"

export function MarkFixedButton({ issueId, isFixed }: { issueId: string; isFixed: boolean }) {
  const [fixed, setFixed] = useState(isFixed)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/fix`, { method: "POST" })
      if (res.ok) {
        const data = await res.json() as { isFixed: boolean }
        setFixed(data.isFixed)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        padding: "5px 12px", fontSize: "11px", fontWeight: 700,
        background: fixed ? "var(--success-bg)" : "oklch(0.18 0.006 230)",
        color: fixed ? "var(--success)" : "var(--foreground-3)",
        border: fixed ? "1px solid oklch(0.68 0.16 155 / 0.3)" : "1px solid var(--glass-border)",
        borderRadius: "var(--radius)", cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.6 : 1, transition: "all 200ms",
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}
    >
      {loading ? "…" : fixed ? "✓ Fixed" : "Mark Fixed"}
    </button>
  )
}
