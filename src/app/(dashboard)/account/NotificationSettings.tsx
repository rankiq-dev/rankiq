"use client"
import { useState } from "react"
import { useOptionalToast } from "@/components/ui/Toast"

interface Props {
  notifyAuditComplete: boolean
  notifyWeeklyDigest: boolean
  notifyCriticalOnly: boolean
}

export function NotificationSettings({ notifyAuditComplete, notifyWeeklyDigest, notifyCriticalOnly }: Props) {
  const [prefs, setPrefs] = useState({ notifyAuditComplete, notifyWeeklyDigest, notifyCriticalOnly })
  const [saving, setSaving] = useState(false)
  const { toast } = useOptionalToast()

  async function toggle(key: keyof typeof prefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    try {
      const res = await fetch("/api/v1/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      })
      if (res.ok) {
        toast("Preferences saved", "success")
      } else {
        setPrefs(prefs)
        toast("Failed to save", "error")
      }
    } catch {
      setPrefs(prefs)
      toast("Failed to save", "error")
    } finally {
      setSaving(false)
    }
  }

  const items = [
    {
      key: "notifyAuditComplete" as const,
      label: "Audit complete",
      desc: "Email when a scheduled or manual audit finishes",
    },
    {
      key: "notifyWeeklyDigest" as const,
      label: "Weekly digest",
      desc: "A summary of SEO health across all your sites every Monday",
    },
    {
      key: "notifyCriticalOnly" as const,
      label: "Critical issues only",
      desc: "Only notify when a critical-severity issue is found",
    },
  ]

  return (
    <div style={{
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)", padding: "24px",
      opacity: saving ? 0.7 : 1, transition: "opacity 200ms",
    }}>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "20px", letterSpacing: "-0.2px" }}>
        Email Notifications
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {items.map(({ key, label, desc }) => (
          <label key={key} style={{
            display: "flex", alignItems: "flex-start", gap: "12px",
            cursor: saving ? "default" : "pointer",
          }}>
            <div
              onClick={() => !saving && toggle(key)}
              style={{
                width: "36px", height: "20px", borderRadius: "10px",
                background: prefs[key] ? "var(--primary)" : "oklch(0.25 0.01 230)",
                border: `1.5px solid ${prefs[key] ? "var(--primary)" : "var(--glass-border)"}`,
                position: "relative", flexShrink: 0, marginTop: "2px",
                transition: "background 200ms, border-color 200ms", cursor: "pointer",
              }}>
              <div style={{
                width: "14px", height: "14px", borderRadius: "50%", background: "white",
                position: "absolute", top: "2px",
                left: prefs[key] ? "18px" : "2px",
                transition: "left 200ms",
                boxShadow: "0 1px 3px oklch(0 0 0 / 0.3)",
              }} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{label}</div>
              <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "2px" }}>{desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
