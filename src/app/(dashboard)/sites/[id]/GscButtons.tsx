"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOptionalToast } from "@/components/ui/Toast"

export function GscRefreshButton({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useOptionalToast()
  const router = useRouter()

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/sites/${siteId}/gsc`, { method: "POST" })
      if (res.ok) {
        toast("GSC data refreshed", "success")
        router.refresh()
      } else {
        toast("Failed to refresh GSC data", "error")
      }
    } catch {
      toast("Failed to refresh GSC data", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={refresh} disabled={loading} style={{
      padding: "7px 12px", background: "transparent",
      color: loading ? "var(--foreground-3)" : "var(--foreground-2)",
      borderRadius: "var(--radius)", fontSize: "12px",
      fontWeight: 600, border: "1px solid var(--glass-border)",
      cursor: loading ? "default" : "pointer", fontFamily: "var(--font-sans), sans-serif",
      opacity: loading ? 0.6 : 1, transition: "opacity 150ms",
    }}>
      {loading ? "Refreshing…" : "Refresh data"}
    </button>
  )
}

export function GscDisconnectButton({ siteId }: { siteId: string }) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "loading">("idle")
  const { toast } = useOptionalToast()
  const router = useRouter()

  async function disconnect() {
    setPhase("loading")
    try {
      const res = await fetch(`/api/v1/sites/${siteId}/gsc`, { method: "DELETE" })
      if (res.ok) {
        toast("Google Search Console disconnected", "info")
        router.refresh()
      } else {
        toast("Failed to disconnect GSC", "error")
        setPhase("idle")
      }
    } catch {
      toast("Failed to disconnect GSC", "error")
      setPhase("idle")
    }
  }

  if (phase === "idle") {
    return (
      <button onClick={() => setPhase("confirm")} style={{
        padding: "7px 12px", background: "transparent",
        color: "var(--foreground-3)", borderRadius: "var(--radius)", fontSize: "12px",
        fontWeight: 600, border: "1px solid var(--glass-border)",
        cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
      }}>Disconnect</button>
    )
  }

  if (phase === "confirm") {
    return (
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "var(--foreground-3)" }}>Disconnect GSC?</span>
        <button onClick={disconnect} style={{
          padding: "5px 10px", fontSize: "11px", fontWeight: 700,
          background: "var(--destructive)", color: "white",
          border: "none", borderRadius: "var(--radius)", cursor: "pointer",
          fontFamily: "var(--font-sans), sans-serif",
        }}>Yes</button>
        <button onClick={() => setPhase("idle")} style={{
          padding: "5px 10px", fontSize: "11px", fontWeight: 600,
          background: "transparent", color: "var(--foreground-3)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius)",
          cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
        }}>Cancel</button>
      </div>
    )
  }

  return <span style={{ fontSize: "12px", color: "var(--foreground-3)" }}>Disconnecting…</span>
}
