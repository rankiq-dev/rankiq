"use client"
import { useState, useRef } from "react"
import { useOptionalToast } from "@/components/ui/Toast"
import { useRouter } from "next/navigation"

export function SiteNameEditor({ siteId, displayName, domain }: { siteId: string; displayName: string | null; domain: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(displayName ?? "")
  const [loading, setLoading] = useState(false)
  const { toast } = useOptionalToast()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  async function save() {
    const trimmed = value.trim()
    if (trimmed === (displayName ?? "")) { setEditing(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed || null }),
      })
      if (res.ok) {
        toast("Site name updated", "success")
        router.refresh()
        setEditing(false)
      } else {
        toast("Failed to update site name", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  if (!editing) {
    return (
      <button onClick={startEdit} style={{
        background: "transparent", border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: "8px", padding: 0,
      }}>
        <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", lineHeight: 1.1 }}>
          {displayName ?? domain}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4, marginTop: "4px" }}>
          <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
        placeholder={domain}
        disabled={loading}
        style={{
          fontSize: "22px", fontWeight: 800, color: "var(--foreground)",
          background: "oklch(0.14 0.006 230)", border: "1px solid var(--primary)",
          borderRadius: "var(--radius-md)", padding: "4px 10px",
          fontFamily: "var(--font-sans), sans-serif", outline: "none",
          letterSpacing: "-0.5px", width: "280px",
        }}
      />
      <button onClick={save} disabled={loading} style={{
        padding: "6px 12px", fontSize: "11px", fontWeight: 700,
        background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
        color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
        cursor: loading ? "default" : "pointer", fontFamily: "var(--font-sans), sans-serif",
        opacity: loading ? 0.6 : 1,
      }}>Save</button>
      <button onClick={() => setEditing(false)} style={{
        padding: "6px 10px", fontSize: "11px", background: "transparent",
        color: "var(--foreground-3)", border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-md)", cursor: "pointer",
        fontFamily: "var(--font-sans), sans-serif",
      }}>✕</button>
    </div>
  )
}
