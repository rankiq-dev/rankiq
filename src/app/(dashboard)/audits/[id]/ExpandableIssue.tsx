"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  title: string
  description: string
  severity: string
  category: string
  affectedCount: number
  affectedUrls?: string[]
  fixInstructions?: string | null
  isFixed?: boolean
  scoreImpact?: number
  issueId?: string
  auditId?: string
  fixTimeLabel?: string
  children?: React.ReactNode
}

const SEV_COLOR: Record<string, string> = {
  critical: "var(--destructive)", warning: "var(--warning)", info: "var(--info)", error: "var(--destructive)",
}
const SEV_BG: Record<string, string> = {
  critical: "var(--destructive-bg)", warning: "var(--warning-bg)", info: "var(--info-bg)", error: "var(--destructive-bg)",
}

export function ExpandableIssue({ title, description, severity, category, affectedCount, affectedUrls, fixInstructions, isFixed: initialFixed, scoreImpact, issueId, auditId, fixTimeLabel, children }: Props) {
  const [open, setOpen] = useState(false)
  const [fixed, setFixed] = useState(initialFixed ?? false)
  const [toggling, setToggling] = useState(false)
  const router = useRouter()
  const color = SEV_COLOR[severity] ?? "var(--foreground-3)"
  const bg = SEV_BG[severity] ?? "oklch(0.15 0.006 230)"

  async function toggleFixed(e: React.MouseEvent) {
    e.stopPropagation()
    if (!issueId || !auditId || toggling) return
    setToggling(true)
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [issueId], fixed: !fixed }),
      })
      if (res.ok) {
        setFixed(!fixed)
        router.refresh()
      }
    } finally {
      setToggling(false)
    }
  }

  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: `1px solid var(--glass-border)`,
      borderLeft: `3px solid ${isFixed ? "var(--success)" : color}`,
      borderRadius: "var(--radius-xl)",
      opacity: isFixed ? 0.55 : 1,
      transition: "opacity 200ms",
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", padding: "14px 18px", background: "transparent", border: "none",
        cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px",
        textAlign: "left", fontFamily: "var(--font-sans), sans-serif",
      }}>
        <span style={{
          padding: "2px 8px", background: bg, color,
          borderRadius: "4px", fontSize: "9px", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, marginTop: "2px",
        }}>{severity}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>{title}</div>
          <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "2px" }}>
            {affectedCount} page{affectedCount !== 1 ? "s" : ""} · {category.replace(/_/g, " ")}
          </div>
        </div>
        {scoreImpact != null && scoreImpact > 0 && (
          <span style={{
            flexShrink: 0, fontSize: "9px", fontWeight: 700,
            padding: "2px 6px", borderRadius: "20px",
            background: "oklch(0.68 0.16 155 / 0.12)",
            color: "var(--success)", border: "1px solid oklch(0.68 0.16 155 / 0.2)",
            whiteSpace: "nowrap", marginTop: "2px",
          }}>+{scoreImpact} pts</span>
        )}
        {fixTimeLabel && (
          <span style={{
            flexShrink: 0, fontSize: "9px", fontWeight: 600,
            padding: "2px 6px", borderRadius: "20px",
            background: "var(--glass-bg)",
            color: "var(--foreground-3)", border: "1px solid var(--glass-border)",
            whiteSpace: "nowrap", marginTop: "2px",
          }}>⏱ {fixTimeLabel}</span>
        )}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: "3px", transition: "transform 200ms", transform: open ? "rotate(180deg)" : "none", color: "var(--foreground-3)" }}>
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "0 18px 16px 18px", borderTop: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: "12px", color: "var(--foreground-2)", lineHeight: 1.6, marginTop: "12px", marginBottom: "10px" }}>
            {description}
          </p>

          {fixInstructions && (
            <div style={{
              background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.2)",
              borderLeft: "3px solid var(--primary)", borderRadius: "8px",
              padding: "10px 14px", marginBottom: "10px",
            }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--primary-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px" }}>
                ✦ How to fix
              </div>
              <p style={{ fontSize: "12px", color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>{fixInstructions}</p>
            </div>
          )}

          {affectedUrls && affectedUrls.length > 0 && (
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>
                Affected URLs
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {affectedUrls.slice(0, 8).map(url => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--primary-2)",
                    textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{url}</a>
                ))}
                {affectedUrls.length > 8 && (
                  <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>+{affectedUrls.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          {issueId && auditId && (
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={toggleFixed} disabled={toggling} style={{
                padding: "5px 12px", fontSize: "11px", fontWeight: 600,
                background: fixed ? "oklch(0.68 0.16 155 / 0.12)" : "var(--glass-bg)",
                color: fixed ? "var(--success)" : "var(--foreground-3)",
                border: fixed ? "1px solid oklch(0.68 0.16 155 / 0.3)" : "1px solid var(--glass-border)",
                borderRadius: "var(--radius-md)", cursor: toggling ? "default" : "pointer",
                fontFamily: "var(--font-sans), sans-serif", transition: "all 150ms",
                opacity: toggling ? 0.6 : 1,
              }}>
                {toggling ? "…" : fixed ? "✓ Fixed — click to unmark" : "Mark as fixed"}
              </button>
            </div>
          )}

          {children && <div style={{ marginTop: "10px" }}>{children}</div>}
        </div>
      )}
    </div>
  )
}
