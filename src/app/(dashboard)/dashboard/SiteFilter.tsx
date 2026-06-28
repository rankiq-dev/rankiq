"use client"
import { useState } from "react"

export function SiteFilter({ count }: { count: number }) {
  const [query, setQuery] = useState("")

  function filter(value: string) {
    setQuery(value)
    const q = value.toLowerCase()
    document.querySelectorAll<HTMLElement>("[data-site-card]").forEach(el => {
      const name = (el.dataset.siteName ?? "").toLowerCase()
      el.style.display = !q || name.includes(q) ? "" : "none"
    })
  }

  if (count < 4) return null

  return (
    <input
      value={query}
      onChange={e => filter(e.target.value)}
      placeholder={`Search ${count} sites…`}
      style={{
        padding: "7px 14px", fontSize: "12px", width: "200px",
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-md)", color: "var(--foreground)",
        fontFamily: "var(--font-mono), monospace", outline: "none",
      }}
    />
  )
}
