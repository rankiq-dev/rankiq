"use client"
import { useState } from "react"

export function BulkAuditButton({ siteCount }: { siteCount: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [count, setCount] = useState(0)

  async function trigger() {
    if (state === "loading") return
    setState("loading")
    try {
      const res = await fetch("/api/v1/agency/bulk-audit", { method: "POST" })
      const data = await res.json() as { data?: { triggered?: number } }
      if (res.ok) {
        setCount(data.data?.triggered ?? 0)
        setState("done")
        setTimeout(() => setState("idle"), 4000)
      } else {
        setState("error")
        setTimeout(() => setState("idle"), 3000)
      }
    } catch {
      setState("error")
      setTimeout(() => setState("idle"), 3000)
    }
  }

  const label = {
    idle: `Audit All (${siteCount})`,
    loading: "Queueing…",
    done: `✓ ${count} audits queued`,
    error: "Error — try again",
  }[state]

  return (
    <button
      onClick={trigger}
      disabled={state === "loading"}
      style={{
        padding: "9px 16px", fontSize: "12px", fontWeight: 600,
        background: state === "done" ? "var(--success-bg)" : state === "error" ? "var(--destructive-bg)" : "var(--glass-bg)",
        color: state === "done" ? "var(--success)" : state === "error" ? "var(--destructive)" : "var(--foreground-2)",
        border: state === "done" ? "1px solid oklch(0.68 0.16 155 / 0.3)" : "1px solid var(--glass-border)",
        borderRadius: "var(--radius-md)", cursor: state === "loading" ? "not-allowed" : "pointer",
        fontFamily: "var(--font-sans), sans-serif",
        transition: "all 200ms", opacity: state === "loading" ? 0.7 : 1,
      }}
    >{label}</button>
  )
}
