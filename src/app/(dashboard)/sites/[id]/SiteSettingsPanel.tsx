"use client"
import { useState } from "react"
import { useOptionalToast } from "@/components/ui/Toast"
import { useRouter } from "next/navigation"

const SCHEDULE_OPTIONS = [
  { value: "off", label: "Off", desc: "Manual audits only" },
  { value: "weekly", label: "Weekly", desc: "Every Monday at 2am UTC" },
  { value: "biweekly", label: "Bi-weekly", desc: "Every other Monday" },
  { value: "monthly", label: "Monthly", desc: "First Monday of each month" },
]

const PAGE_OPTIONS = [50, 100, 200, 500]
const DELAY_OPTIONS = [
  { ms: 250, label: "250ms", desc: "Fast (aggressive)" },
  { ms: 500, label: "500ms", desc: "Normal" },
  { ms: 1000, label: "1s", desc: "Polite" },
  { ms: 2000, label: "2s", desc: "Very polite" },
]

interface Props {
  siteId: string
  auditSchedule: string
  maxPages: number
  crawlDelayMs: number
  clientLabel: string | null
}

export function SiteSettingsPanel({ siteId, auditSchedule, maxPages, crawlDelayMs, clientLabel }: Props) {
  const [schedule, setSchedule] = useState(auditSchedule)
  const [pages, setPages] = useState(maxPages)
  const [delay, setDelay] = useState(crawlDelayMs)
  const [label, setLabel] = useState(clientLabel ?? "")
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState(false)
  const { toast } = useOptionalToast()
  const router = useRouter()

  function onSchedule(v: string) { setSchedule(v); setChanged(true) }
  function onPages(v: number) { setPages(v); setChanged(true) }
  function onDelay(v: number) { setDelay(v); setChanged(true) }
  function onLabel(v: string) { setLabel(v); setChanged(true) }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditSchedule: schedule, maxPages: pages, crawlDelayMs: delay, clientLabel: label.trim() || null }),
      })
      if (res.ok) {
        toast("Settings saved", "success")
        setChanged(false)
        router.refresh()
      } else {
        toast("Failed to save settings", "error")
      }
    } finally {
      setSaving(false)
    }
  }

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} style={{
      padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
      cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
      border: active ? "1.5px solid var(--primary)" : "1px solid var(--glass-border)",
      background: active ? "var(--primary-soft)" : "transparent",
      color: active ? "var(--primary-2)" : "var(--foreground-3)",
      transition: "all 150ms",
    }}>{label}</button>
  )

  return (
    <div style={{
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)", padding: "24px",
    }}>
      <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)", marginBottom: "20px", letterSpacing: "-0.1px" }}>
        Audit Settings
      </h3>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--foreground-3)", marginBottom: "10px" }}>
          Schedule
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {SCHEDULE_OPTIONS.map(({ value, label }) => pill(label, schedule === value, () => onSchedule(value)))}
        </div>
        <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "6px" }}>
          {SCHEDULE_OPTIONS.find(o => o.value === schedule)?.desc}
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--foreground-3)", marginBottom: "10px" }}>
          Max pages per audit
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {PAGE_OPTIONS.map(n => pill(`${n}`, pages === n, () => onPages(n)))}
        </div>
        <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "6px" }}>
          Crawl up to {pages} pages per run
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--foreground-3)", marginBottom: "10px" }}>
          Crawl delay
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {DELAY_OPTIONS.map(opt => pill(opt.label, delay === opt.ms, () => onDelay(opt.ms)))}
        </div>
        <div style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "6px" }}>
          {DELAY_OPTIONS.find(o => o.ms === delay)?.desc} — time between page fetches
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--foreground-3)", marginBottom: "8px" }}>
          Client label <span style={{ fontWeight: 400, textTransform: "none" }}>(agency)</span>
        </div>
        <input
          value={label}
          onChange={e => onLabel(e.target.value)}
          placeholder="e.g. Acme Corp"
          style={{
            width: "100%", padding: "8px 12px", fontSize: "12px",
            background: "oklch(0.14 0.006 230)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)", color: "var(--foreground)",
            fontFamily: "var(--font-sans), sans-serif", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginTop: "4px" }}>Tag this site to group clients in the agency view</div>
      </div>

      {changed && (
        <button onClick={save} disabled={saving} style={{
          padding: "8px 20px", fontSize: "12px", fontWeight: 700,
          background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
          color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
          cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans), sans-serif",
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      )}
    </div>
  )
}
