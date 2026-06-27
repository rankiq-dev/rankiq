"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface StatusData {
  status: string
  pagesCount?: number
  maxPages?: number
  stage?: string
}

interface Props {
  auditId: string
  initialStatus: string
}

export function AuditProgress({ auditId, initialStatus }: Props) {
  const [data, setData] = useState<StatusData>({ status: initialStatus })
  const [dots, setDots] = useState(0)
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (data.status === "complete" || data.status === "failed") return

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/audits/${auditId}/status`)
        const json = await res.json() as { data?: StatusData }
        if (json.data) {
          setData(json.data)
          if (json.data.status === "complete" || json.data.status === "failed") {
            if (intervalRef.current) clearInterval(intervalRef.current)
            router.refresh()
          }
        }
      } catch { /* ignore */ }
    }

    intervalRef.current = setInterval(poll, 3000)
    poll()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [auditId, data.status, router])

  // Animated dots
  useEffect(() => {
    if (data.status === "complete" || data.status === "failed") return
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [data.status])

  if (data.status === "complete" || data.status === "failed") return null

  const pct = data.pagesCount && data.maxPages ? Math.min(100, Math.round((data.pagesCount / data.maxPages) * 100)) : null
  const stage = data.stage ?? data.status

  return (
    <div style={{
      background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
      borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: pct != null ? "12px" : 0 }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary-2)", animation: "pulse 1.5s infinite" }} />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary-2)" }}>
            Audit in progress{".".repeat(dots)}
          </div>
          <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "1px", textTransform: "capitalize" }}>
            {stage.replace(/_/g, " ")}
            {data.pagesCount != null ? ` · ${data.pagesCount} pages crawled` : ""}
          </div>
        </div>
      </div>
      {pct != null && (
        <div style={{ background: "oklch(0.15 0.008 230)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--primary), var(--primary-2))", borderRadius: "4px", transition: "width 1s ease" }} />
        </div>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
