"use client"
import { useState } from "react"
import { useOptionalToast } from "@/components/ui/Toast"

export function ShareButton({ auditId, initialToken }: { auditId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useOptionalToast()

  const shareUrl = token ? `${window.location.origin}/share/${token}` : null

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json() as { data?: { shareToken?: string | null } }
      if (data?.data?.shareToken) {
        setToken(data.data.shareToken)
        toast("Share link generated", "success")
      }
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke: true }),
      })
      const data = await res.json() as { data?: { shareToken?: string | null } }
      if (data?.data && "shareToken" in data.data) {
        setToken(null)
        toast("Share link revoked", "info")
      }
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!token) {
    return (
      <button onClick={generate} disabled={loading} style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "7px 12px", fontSize: "12px", fontWeight: 600,
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-md)", color: "var(--foreground-3)",
        cursor: loading ? "default" : "pointer",
        fontFamily: "var(--font-sans), sans-serif",
        opacity: loading ? 0.6 : 1,
      }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="2" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M3.5 5l4-2.5M3.5 6l4 2.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        Share
      </button>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <button onClick={copy} style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "7px 12px", fontSize: "12px", fontWeight: 600,
        background: copied ? "var(--success-bg)" : "var(--primary-soft)",
        border: `1px solid ${copied ? "var(--success)" : "oklch(0.55 0.13 178 / 0.3)"}`,
        borderRadius: "var(--radius-md)", color: copied ? "var(--success)" : "var(--primary-2)",
        cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
        transition: "all 200ms",
      }}>
        {copied ? "Copied!" : "Copy link"}
      </button>
      <button onClick={revoke} disabled={loading} style={{
        padding: "7px 10px", fontSize: "11px", fontWeight: 600,
        background: "transparent", color: "var(--foreground-3)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
        cursor: loading ? "default" : "pointer",
        fontFamily: "var(--font-sans), sans-serif",
        opacity: loading ? 0.6 : 1,
      }}>Revoke</button>
    </div>
  )
}
