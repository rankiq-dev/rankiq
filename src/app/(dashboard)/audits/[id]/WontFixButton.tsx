"use client"
import { useState, useEffect } from "react"

interface Props {
  issueId: string
}

const KEY = (id: string) => `rankiq_wont_fix_${id}`

export function WontFixButton({ issueId }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try { setDismissed(localStorage.getItem(KEY(issueId)) === "1") } catch { /* ignore */ }
  }, [issueId])

  function toggle() {
    const next = !dismissed
    try { next ? localStorage.setItem(KEY(issueId), "1") : localStorage.removeItem(KEY(issueId)) } catch { /* ignore */ }
    setDismissed(next)
  }

  return (
    <button onClick={e => { e.stopPropagation(); toggle() }} style={{
      padding: "2px 8px", fontSize: "9px", fontWeight: 700,
      background: dismissed ? "oklch(0.18 0.008 230)" : "transparent",
      border: "1px solid var(--glass-border)", borderRadius: "20px",
      color: dismissed ? "var(--foreground-3)" : "var(--foreground-3)",
      cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
      opacity: dismissed ? 0.7 : 0.4,
      textDecoration: dismissed ? "line-through" : "none",
    }} title={dismissed ? "Click to undo won't fix" : "Mark as won't fix"}>
      {dismissed ? "Won't fix ✓" : "Won't fix"}
    </button>
  )
}
