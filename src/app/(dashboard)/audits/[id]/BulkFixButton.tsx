"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOptionalToast } from "@/components/ui/Toast"

interface Props {
  auditId: string
  totalCount: number
  fixedCount: number
}

const CONFETTI_COLORS = ["#22d3ee", "#34d399", "#a78bfa", "#f59e0b", "#f472b6"]

function burst() {
  const container = document.createElement("div")
  container.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;overflow:hidden"
  document.body.appendChild(container)
  for (let i = 0; i < 40; i++) {
    const p = document.createElement("div")
    const x = 20 + Math.random() * 60
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    p.style.cssText = `position:absolute;left:${x}%;top:-10px;width:8px;height:8px;background:${color};border-radius:2px;transform:rotate(${Math.random()*360}deg);animation:confetti-fall ${0.8+Math.random()*1}s ease-in forwards;animation-delay:${Math.random()*0.4}s`
    container.appendChild(p)
  }
  if (!document.getElementById("confetti-style")) {
    const s = document.createElement("style")
    s.id = "confetti-style"
    s.textContent = "@keyframes confetti-fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}"
    document.head.appendChild(s)
  }
  setTimeout(() => container.remove(), 2000)
}

export function BulkFixButton({ auditId, totalCount, fixedCount }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useOptionalToast()

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
        if (!allFixed) burst()
        toast(`${data.data.updated} issue${data.data.updated !== 1 ? "s" : ""} ${allFixed ? "unmarked" : "marked fixed"}`, "success")
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
