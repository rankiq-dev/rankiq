"use client"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const stored = document.cookie.match(/rankiq_theme=([^;]+)/)?.[1] as "dark" | "light" | undefined
    if (stored) {
      setTheme(stored)
      document.documentElement.setAttribute("data-theme", stored)
    }
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
    document.cookie = `rankiq_theme=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
  }

  return (
    <button onClick={toggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} style={{
      width: "28px", height: "28px", borderRadius: "8px",
      background: "oklch(0.18 0.006 230)",
      border: "1px solid var(--glass-border)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", padding: 0, flexShrink: 0,
      color: "var(--foreground-3)",
    }}>
      {theme === "dark" ? (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M6.5 1v1M6.5 11v1M1 6.5h1M11 6.5h1M2.5 2.5l.7.7M9.8 9.8l.7.7M2.5 10.5l.7-.7M9.8 3.2l.7-.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M11 7.5A5 5 0 1 1 5.5 2a3.5 3.5 0 0 0 5.5 5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}
