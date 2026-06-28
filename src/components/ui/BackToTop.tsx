"use client"
import { useState, useEffect } from "react"

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 400) }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
        width: "36px", height: "36px", borderRadius: "50%",
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)", color: "var(--foreground-2)",
        cursor: "pointer", fontSize: "14px",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 12px oklch(0 0 0 / 0.3)",
        fontFamily: "var(--font-sans), sans-serif",
        transition: "opacity 0.2s",
      }}
    >↑</button>
  )
}
