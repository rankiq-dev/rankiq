"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Silently polls the audit status and refreshes the page when the audit finishes.
 * Only active when audit is in "running" or "queued" state.
 */
export function AuditPoller({ auditId, intervalMs = 5000 }: { auditId: string; intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/audits/${auditId}/status`, { method: "GET" })
        if (!res.ok) return
        const data = await res.json() as { status?: string }
        if (data.status === "complete" || data.status === "failed") {
          clearInterval(timer)
          router.refresh()
        }
      } catch {
        // Ignore network errors — will retry on next tick
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [auditId, intervalMs, router])

  return null
}
