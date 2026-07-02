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
  siteId: string
  initialStatus: string
}

export function AuditProgress({ auditId, siteId, initialStatus }: Props) {
  const [data, setData] = useState<StatusData>({ status: initialStatus })
  const [dots, setDots] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [stallWarning, setStallWarning] = useState(false)
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data.status === "complete" || data.status === "failed") return

    // If still queued after 30 seconds, show stall warning
    if (data.status === "queued") {
      stallTimerRef.current = setTimeout(() => setStallWarning(true), 30000)
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/audits/${auditId}/status`)
        const json = await res.json() as { data?: StatusData }
        if (json.data) {
          setData(json.data)
          if (json.data.status !== "queued") setStallWarning(false)
          if (json.data.status === "complete" || json.data.status === "failed") {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
            router.refresh()
          }
        }
      } catch { /* ignore */ }
    }

    intervalRef.current = setInterval(poll, 3000)
    poll()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    }
  }, [auditId, data.status, router])

  useEffect(() => {
    if (data.status === "complete" || data.status === "failed") return
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [data.status])

  if (data.status === "complete") return null

  // Failed state
  if (data.status === "failed") {
    return (
      <div style={{
        background: "oklch(0.55 0.18 25 / 0.10)", border: "1px solid oklch(0.55 0.18 25 / 0.30)",
        borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ fontSize: "20px", lineHeight: 1 }}>⚠️</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "oklch(0.75 0.18 25)", marginBottom: "4px" }}>
                Audit failed
              </div>
              <div style={{ fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.5 }}>
                The crawl did not complete. This usually means the site was unreachable, the crawler timed out, or the worker process is not running.
              </div>
            </div>
          </div>
          <button
            disabled={retrying}
            onClick={async () => {
              setRetrying(true)
              try {
                const res = await fetch("/api/v1/audits", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ siteId }),
                })
                const json = await res.json() as { data?: { id: string } }
                if (json.data?.id) router.push(`/audits/${json.data.id}`)
              } catch { /* ignore */ } finally { setRetrying(false) }
            }}
            style={{
              flexShrink: 0, padding: "7px 14px", fontSize: "12px", fontWeight: 700,
              background: retrying ? "oklch(0.98 0 0 / 0.05)" : "oklch(0.55 0.18 25 / 0.15)",
              color: retrying ? "var(--foreground-3)" : "oklch(0.75 0.18 25)",
              border: "1px solid oklch(0.55 0.18 25 / 0.30)", borderRadius: "8px",
              cursor: retrying ? "not-allowed" : "pointer",
            }}
          >
            {retrying ? "Starting…" : "↺ Retry audit"}
          </button>
        </div>
      </div>
    )
  }

  const pct = data.pagesCount && data.maxPages ? Math.min(100, Math.round((data.pagesCount / data.maxPages) * 100)) : null
  const stage = data.stage ?? data.status
  const isQueued = data.status === "queued"

  return (
    <div style={{
      background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
      borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: pct != null ? "12px" : 0 }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary-2)", animation: "pulse 1.5s infinite" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary-2)" }}>
            {isQueued ? `Queued${".".repeat(dots)}` : `Audit in progress${".".repeat(dots)}`}
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
      {stallWarning && (
        <div style={{
          marginTop: "12px", padding: "10px 14px",
          background: "oklch(0.55 0.14 60 / 0.10)", border: "1px solid oklch(0.55 0.14 60 / 0.25)",
          borderRadius: "8px", fontSize: "11px", color: "oklch(0.72 0.14 60)", lineHeight: 1.5,
        }}>
          <strong>Still queued?</strong> The background worker may not be running.
          Run <code style={{ background: "oklch(0.15 0.008 230)", padding: "1px 4px", borderRadius: "3px" }}>npm run worker</code> in a second terminal to process audits.
        </div>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
