"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RunAuditButton({ siteId }: { siteId: string }) {
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
      const data = await res.json()
      if (data?.data?.auditId) {
        router.push(`/audits/${data.data.auditId}`)
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
        padding: "9px 16px",
        background: loading
          ? "oklch(0.35 0.08 178)"
          : "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
        color: "oklch(0.98 0.005 230)",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 700,
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        letterSpacing: "0.02em",
      }}
    >
      {loading ? "Starting…" : "▶ Run Audit"}
    </button>
  )
}
