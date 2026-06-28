"use client"
import { useState } from "react"

interface Issue {
  type: string
  severity: string
  description: string
  affectedUrl?: string | null
}

export function CopyIssuesButton({ auditId }: { auditId: string }) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function copy() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/issues?limit=500`)
      const data = await res.json() as { data?: { issues: Issue[] } }
      const issues = data.data?.issues ?? []
      if (!issues.length) return
      const lines = issues.map(i =>
        `[${i.severity.toUpperCase()}] ${i.type.replace(/_/g, " ")}: ${i.description}${i.affectedUrl ? ` (${i.affectedUrl})` : ""}`
      )
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={copy} disabled={loading} style={{
      padding: "4px 12px", fontSize: "10px", fontWeight: 700,
      background: "oklch(0.18 0.008 230)", border: "1px solid var(--glass-border)",
      borderRadius: "20px", color: copied ? "var(--success)" : "var(--foreground-3)",
      cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
      fontFamily: "var(--font-sans), sans-serif", transition: "color 0.2s",
    }}>
      {loading ? "…" : copied ? "✓ Copied" : "Copy all issues"}
    </button>
  )
}
