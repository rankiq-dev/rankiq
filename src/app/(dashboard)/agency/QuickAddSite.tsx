"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function QuickAddSite() {
  const [open, setOpen] = useState(false)
  const [domain, setDomain] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function add() {
    const raw = domain.trim()
    if (!raw) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: raw }),
      })
      const data = await res.json() as { data?: { id: string }; error?: string }
      if (data.data?.id) {
        router.push(`/sites/${data.data.id}`)
        router.refresh()
      } else {
        setError(data.error ?? "Could not add site")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "7px 16px", fontSize: "12px", fontWeight: 700,
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-md)", color: "var(--foreground-2)",
        cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
      }}>
        + Add client site
      </button>
    )
  }

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <input
        autoFocus
        value={domain}
        onChange={e => setDomain(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !loading) add(); if (e.key === "Escape") setOpen(false) }}
        placeholder="example.com"
        style={{
          padding: "7px 14px", fontSize: "13px",
          background: "var(--glass-bg)", border: "1px solid oklch(0.55 0.13 178 / 0.4)",
          borderRadius: "var(--radius-md)", color: "var(--foreground)",
          fontFamily: "var(--font-mono), monospace", outline: "none", width: "220px",
        }}
      />
      <button onClick={add} disabled={loading || !domain.trim()} style={{
        padding: "7px 16px", fontSize: "12px", fontWeight: 700,
        background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
        color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
        cursor: loading || !domain.trim() ? "default" : "pointer",
        opacity: loading || !domain.trim() ? 0.6 : 1,
        fontFamily: "var(--font-sans), sans-serif",
      }}>
        {loading ? "Adding…" : "Add →"}
      </button>
      <button onClick={() => { setOpen(false); setError(null); setDomain("") }} style={{
        padding: "7px 12px", fontSize: "12px", background: "transparent",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
        color: "var(--foreground-3)", cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
      }}>Cancel</button>
      {error && <span style={{ fontSize: "11px", color: "var(--destructive)" }}>{error}</span>}
    </div>
  )
}
