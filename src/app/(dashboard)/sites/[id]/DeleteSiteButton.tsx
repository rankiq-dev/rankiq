"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function DeleteSiteButton({ siteId, domain }: { siteId: string; domain: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<"idle" | "confirm" | "deleting">("idle")

  async function handleDelete() {
    setPhase("deleting")
    try {
      const res = await fetch(`/api/v1/sites/${siteId}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/dashboard")
      } else {
        setPhase("confirm")
      }
    } catch {
      setPhase("confirm")
    }
  }

  if (phase === "idle") {
    return (
      <button onClick={() => setPhase("confirm")} style={{
        padding: "8px 14px", fontSize: "12px", fontWeight: 600,
        background: "transparent", color: "var(--foreground-3)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
        cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
        transition: "all 150ms",
      }}>
        Delete site
      </button>
    )
  }

  if (phase === "confirm") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 12px", borderRadius: "var(--radius-md)",
        background: "var(--destructive-bg)", border: "1px solid oklch(0.65 0.20 27 / 0.3)",
      }}>
        <span style={{ fontSize: "12px", color: "var(--destructive)" }}>
          Delete <strong>{domain}</strong>?
        </span>
        <button onClick={handleDelete} style={{
          padding: "4px 10px", fontSize: "11px", fontWeight: 700,
          background: "var(--destructive)", color: "white",
          border: "none", borderRadius: "var(--radius)", cursor: "pointer",
          fontFamily: "var(--font-sans), sans-serif",
        }}>Yes, delete</button>
        <button onClick={() => setPhase("idle")} style={{
          padding: "4px 10px", fontSize: "11px", fontWeight: 600,
          background: "transparent", color: "var(--foreground-3)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius)",
          cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
        }}>Cancel</button>
      </div>
    )
  }

  return (
    <span style={{ fontSize: "12px", color: "var(--foreground-3)" }}>Deleting…</span>
  )
}
