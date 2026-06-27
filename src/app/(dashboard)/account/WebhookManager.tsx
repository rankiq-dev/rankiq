"use client"
import { useState } from "react"

interface Webhook {
  id: string
  url: string
  secret: string
  events: string
  isActive: boolean
  lastFiredAt: string | null
  lastStatus: number | null
  failureCount: number
}

interface Props {
  initialWebhooks: Webhook[]
}

export function WebhookManager({ initialWebhooks }: Props) {
  const [webhooks, setWebhooks] = useState(initialWebhooks)
  const [newUrl, setNewUrl] = useState("")
  const [newEvents, setNewEvents] = useState("audit.complete")
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState<{ id: string; secret: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (!newUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/account/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents }),
      })
      const data = await res.json() as { data?: Webhook & { secret: string }; error?: string }
      if (data.data) {
        setWebhooks(prev => [...prev, data.data!])
        setRevealed({ id: data.data.id, secret: data.data.secret })
        setNewUrl("")
      } else {
        setError(data.error ?? "Failed to create webhook")
      }
    } finally {
      setLoading(false)
    }
  }

  async function deleteWebhook(id: string) {
    await fetch(`/api/v1/account/webhooks?id=${id}`, { method: "DELETE" })
    setWebhooks(prev => prev.filter(w => w.id !== id))
    if (revealed?.id === id) setRevealed(null)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch("/api/v1/account/webhooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !current }),
    })
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, isActive: !current } : w))
  }

  return (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>
        Webhooks
      </div>

      {/* Create form */}
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground-2)", marginBottom: "12px" }}>Add webhook endpoint</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && create()}
            placeholder="https://your-server.com/webhooks/rankiq"
            style={{
              flex: 1, padding: "9px 14px", fontSize: "12px",
              background: "oklch(0.14 0.006 230)", border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-md)", color: "var(--foreground)",
              fontFamily: "var(--font-mono), monospace", outline: "none",
            }}
          />
          <button onClick={create} disabled={loading || !newUrl.trim()} style={{
            padding: "9px 18px", fontSize: "12px", fontWeight: 700,
            background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
            color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
            cursor: loading || !newUrl.trim() ? "default" : "pointer",
            opacity: loading || !newUrl.trim() ? 0.6 : 1,
            fontFamily: "var(--font-sans), sans-serif",
          }}>
            {loading ? "…" : "Add"}
          </button>
        </div>
        <div style={{ fontSize: "10px", color: "var(--foreground-3)" }}>
          Events: <code style={{ fontFamily: "var(--font-mono)" }}>{newEvents}</code>
          {" · "}
          Payloads are signed with <code style={{ fontFamily: "var(--font-mono)" }}>X-RankIQ-Signature: sha256=…</code>
        </div>
        {error && <div style={{ fontSize: "11px", color: "var(--destructive)", marginTop: "8px" }}>{error}</div>}
      </div>

      {/* Revealed secret */}
      {revealed && (
        <div style={{
          background: "var(--success-bg)", border: "1px solid oklch(0.68 0.16 155 / 0.3)",
          borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
              Copy this secret now — it will not be shown again
            </div>
            <code style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--foreground)", wordBreak: "break-all" }}>
              {revealed.secret}
            </code>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(revealed.secret); setRevealed(null) }} style={{
            padding: "5px 12px", fontSize: "11px", fontWeight: 700,
            background: "var(--success)", color: "white", border: "none",
            borderRadius: "6px", cursor: "pointer", flexShrink: 0,
          }}>Copy & dismiss</button>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {webhooks.map(wh => (
            <div key={wh.id} style={{
              background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-xl)", padding: "14px 18px",
              display: "flex", alignItems: "center", gap: "12px",
              opacity: wh.isActive ? 1 : 0.55,
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                background: wh.isActive ? (wh.failureCount > 0 ? "var(--warning)" : "var(--success)") : "var(--foreground-3)",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wh.url}</div>
                <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginTop: "2px" }}>
                  {wh.events} · secret: {wh.secret}
                  {wh.lastFiredAt && ` · last fired: ${new Date(wh.lastFiredAt).toLocaleDateString()}`}
                  {wh.lastStatus && ` · ${wh.lastStatus}`}
                  {wh.failureCount > 0 && <span style={{ color: "var(--warning)" }}> · {wh.failureCount} failures</span>}
                </div>
              </div>
              <button onClick={() => toggleActive(wh.id, wh.isActive)} style={{
                padding: "3px 10px", fontSize: "10px", fontWeight: 700,
                background: "transparent", border: "1px solid var(--glass-border)",
                borderRadius: "20px", color: "var(--foreground-3)", cursor: "pointer",
              }}>
                {wh.isActive ? "Pause" : "Enable"}
              </button>
              <button onClick={() => deleteWebhook(wh.id)} style={{
                padding: "3px 10px", fontSize: "10px", fontWeight: 700,
                background: "transparent", border: "1px solid oklch(0.65 0.20 27 / 0.3)",
                borderRadius: "20px", color: "var(--destructive)", cursor: "pointer",
              }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {webhooks.length === 0 && (
        <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--foreground-3)" }}>
          No webhooks yet. Add an endpoint to receive real-time audit notifications.
        </div>
      )}
    </div>
  )
}
