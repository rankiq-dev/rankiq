"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RunAuditButton({ siteId, style: variant }: { siteId: string; style?: "prominent" | "default" }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      })
      const data = await res.json() as { data?: { auditId?: string } }
      if (data?.data?.auditId) {
        router.push(`/audits/${data.data.auditId}`)
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: variant === "prominent" ? "11px 24px" : "9px 18px", fontSize: variant === "prominent" ? "14px" : "13px", fontWeight: 700,
        background: loading
          ? "oklch(0.35 0.08 178)"
          : "linear-gradient(135deg, var(--primary), var(--primary-2))",
        color: "var(--primary-foreground)",
        borderRadius: "var(--radius-md)", border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        letterSpacing: "0.02em", fontFamily: "var(--font-sans), sans-serif",
        boxShadow: loading ? "none" : "var(--shadow-glow)",
        transition: "all 200ms",
      }}
    >
      {loading ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="7 7"/>
          </svg>
          Starting…
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M3 2l6 3.5L3 9V2z" fill="currentColor"/>
          </svg>
          Run Audit
        </>
      )}
    </button>
  )
}
