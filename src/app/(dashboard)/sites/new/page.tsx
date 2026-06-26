"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Metadata } from "next"

// Note: metadata export only works in Server Components — this is a Client Component.
// Page title is set via the parent layout's template.

export default function NewSitePage() {
  const router = useRouter()
  const [domain, setDomain] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/v1/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), displayName: displayName.trim() || undefined }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? "Failed to add site.")
        return
      }

      /* Trigger initial audit immediately */
      const siteId = json.data?.site?.id
      if (siteId) {
        await fetch("/api/v1/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        })
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: "560px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "oklch(0.92 0.008 230)",
            letterSpacing: "-0.4px",
            marginBottom: "6px",
          }}
        >
          Add a site
        </h1>
        <p style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)" }}>
          Enter your website domain. RankIQ will crawl it and surface SEO issues.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Field label="Domain" hint="e.g. example.com — no https:// needed">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Display name" hint="Optional. How you want to label this site.">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Website"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                background: "oklch(0.14 0.07 27)",
                border: "1px solid oklch(0.65 0.20 27 / 0.3)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "oklch(0.80 0.15 27)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: "10px 18px",
                background: "oklch(0.22 0.006 230)",
                color: "oklch(0.65 0.008 230)",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-sans), sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              style={{
                flex: 1,
                padding: "10px 18px",
                background: loading
                  ? "oklch(0.40 0.08 178)"
                  : "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
                color: "oklch(0.98 0.005 230)",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans), sans-serif",
                opacity: !domain.trim() ? 0.5 : 1,
              }}
            >
              {loading ? "Adding…" : "Add site + start audit"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "oklch(0.13 0.008 230)",
  border: "1px solid oklch(0.22 0.006 230)",
  borderRadius: "8px",
  color: "oklch(0.92 0.008 230)",
  fontSize: "14px",
  fontFamily: "var(--font-sans), sans-serif",
  outline: "none",
  boxSizing: "border-box",
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 700,
          color: "oklch(0.65 0.008 230)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "6px",
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: "11px", color: "oklch(0.38 0.008 230)", marginTop: "4px" }}>{hint}</p>
      )}
    </div>
  )
}
