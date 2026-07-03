"use client"
import { useState } from "react"
import { useOptionalToast } from "@/components/ui/Toast"

export function UserPlanEditor({ userId, currentPlan }: { userId: string; currentPlan: string }) {
  const [plan, setPlan] = useState(currentPlan)
  const [saving, setSaving] = useState(false)
  const { toast } = useOptionalToast()

  async function save(newPlan: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      })
      if (res.ok) {
        setPlan(newPlan)
        toast(`Plan updated to ${newPlan}`, "success")
      } else {
        const err = await res.json().catch(() => null) as { error?: { message?: string } } | null
        toast(err?.error?.message ?? "Failed to update plan", "error")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {["starter", "growth", "agency"].map(p => (
        <button
          key={p}
          onClick={() => save(p)}
          disabled={saving || p === plan}
          style={{
            flex: 1, padding: "8px 12px", fontSize: "12px", fontWeight: 700,
            textTransform: "capitalize", borderRadius: "8px", cursor: p === plan ? "default" : "pointer",
            background: p === plan ? "oklch(0.55 0.20 27 / 0.2)" : "oklch(0.14 0.010 25)",
            border: p === plan ? "1px solid oklch(0.55 0.20 27 / 0.5)" : "1px solid oklch(0.30 0.05 25 / 0.4)",
            color: p === plan ? "oklch(0.75 0.20 27)" : "oklch(0.70 0.008 25)",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
