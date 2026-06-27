"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function RerunButton({ siteId }: { siteId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function rerun() {
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
    <button onClick={rerun} disabled={loading} style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "7px 14px", fontSize: "12px", fontWeight: 700,
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-md)", color: "var(--foreground-2)",
      cursor: loading ? "default" : "pointer",
      fontFamily: "var(--font-sans), sans-serif",
      opacity: loading ? 0.6 : 1,
    }}>
      {loading ? (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6"/>
          </svg>
          Starting…
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5A4 4 0 1 1 5.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M1.5 3v2.5H4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Re-run
        </>
      )}
    </button>
  )
}
