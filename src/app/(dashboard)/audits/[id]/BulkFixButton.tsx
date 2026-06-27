"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOptionalToast } from "@/components/ui/Toast"

interface Props {
  auditId: string
  totalCount: number
  fixedCount: number
}

export function BulkFixButton({ auditId, totalCount, fixedCount }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const toast = useOptionalToast()

  const allFixed = fixedCount === totalCount && totalCount > 0
  const label = allFixed ? "Unmark all" : "Mark all fixed"

  async function handle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, fixed: !allFixed }),
      })
      const data = await res.json() as { data?: { updated: number } }
      if (data.data) {
        toast?.({ message: `${data.data.updated} issue${data.data.updated !== 1 ? "s" : ""} ${allFixed ? "unmarked" : "marked fixed"}`, type: "success" })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (totalCount === 0) return null

  return (
    <button onClick={handle} disabled={loading} style={{
      padding: "4px 12px", fontSize: "10px", fontWeight: 700,
      background: allFixed ? "oklch(0.18 0.008 230)" : "var(--primary-soft)",
      border: allFixed ? "1px solid var(--glass-border)" : "1px solid oklch(0.55 0.13 178 / 0.3)",
      borderRadius: "20px", color: allFixed ? "var(--foreground-3)" : "var(--primary-2)",
      cursor: loading ? "default" : "pointer",
      fontFamily: "var(--font-sans), sans-serif",
      opacity: loading ? 0.6 : 1,
    }}>
      {loading ? "…" : label}
    </button>
  )
}
