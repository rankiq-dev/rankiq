"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

interface Step {
  id: string
  label: string
  href?: string
  done: boolean
}

interface Props {
  hasSite: boolean
  hasAudit: boolean
  hasGsc: boolean
  hasKeywords: boolean
}

const KEY = "rankiq_onboarding_dismissed"

export function OnboardingChecklist({ hasSite, hasAudit, hasGsc, hasKeywords }: Props) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(KEY) === "1")
    } catch { /* ignore */ }
  }, [])

  const allDone = hasSite && hasAudit && hasGsc && hasKeywords
  if (dismissed || allDone) return null

  const steps: Step[] = [
    { id: "site", label: "Add your first site", href: "/sites/new", done: hasSite },
    { id: "audit", label: "Run your first audit", href: hasSite ? undefined : "/sites/new", done: hasAudit },
    { id: "gsc", label: "Connect Google Search Console", done: hasGsc },
    { id: "keywords", label: "Review keyword rankings", href: "/", done: hasKeywords },
  ]

  const doneCount = steps.filter(s => s.done).length

  return (
    <div style={{
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)", padding: "18px 22px", marginBottom: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", marginBottom: "2px" }}>
            Get started with RankIQ
          </div>
          <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{doneCount}/{steps.length} steps complete</div>
        </div>
        <button onClick={() => { try { localStorage.setItem(KEY, "1") } catch { /* ignore */ } setDismissed(true) }} style={{
          background: "transparent", border: "none", color: "var(--foreground-3)", cursor: "pointer", fontSize: "14px",
          fontFamily: "var(--font-sans), sans-serif",
        }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {steps.map(step => (
          <div key={step.id} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "var(--radius-md)", fontSize: "11px", fontWeight: 600,
            background: step.done ? "oklch(0.16 0.04 155 / 0.4)" : "oklch(0.15 0.006 230 / 0.6)",
            border: `1px solid ${step.done ? "oklch(0.60 0.16 155 / 0.3)" : "var(--glass-border)"}`,
            color: step.done ? "var(--success)" : "var(--foreground-2)",
          }}>
            <span style={{ fontFamily: "var(--font-mono)" }}>{step.done ? "✓" : "○"}</span>
            {step.href && !step.done ? (
              <Link href={step.href as any} style={{ color: "inherit", textDecoration: "none" }}>{step.label}</Link>
            ) : (
              <span>{step.label}</span>
            )}
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div style={{ marginTop: "12px", height: "3px", background: "oklch(0.20 0.006 230)", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${doneCount / steps.length * 100}%`, background: "var(--primary)", borderRadius: "2px", transition: "width 0.4s ease" }} />
      </div>
    </div>
  )
}
