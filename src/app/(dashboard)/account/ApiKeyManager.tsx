"use client"
import { useState } from "react"
import { useOptionalToast } from "@/components/ui/Toast"

interface ApiKeyRow {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

interface Props {
  initialKeys: ApiKeyRow[]
}

export function ApiKeyManager({ initialKeys }: Props) {
  const [keys, setKeys] = useState(initialKeys)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useOptionalToast()

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/v1/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json() as { data?: ApiKeyRow & { plaintext?: string } }
      if (data?.data) {
        setNewKey(data.data.plaintext ?? null)
        const { plaintext: _, ...row } = data.data
        setKeys(prev => [row, ...prev])
        setName("")
        toast("API key created", "success")
      }
    } finally {
      setCreating(false)
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/v1/account/api-keys?id=${id}`, { method: "DELETE" })
    setKeys(prev => prev.filter(k => k.id !== id))
    toast("API key revoked", "info")
  }

  async function copy() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "6px", letterSpacing: "-0.2px" }}>
        API Keys
      </h2>
      <p style={{ fontSize: "11px", color: "var(--foreground-3)", marginBottom: "20px", lineHeight: 1.5 }}>
        Programmatic access to RankIQ. Keys are shown once — copy it now.
      </p>

      {/* Create row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !creating && create()}
          placeholder="Key name (e.g. CI/CD)"
          style={{
            flex: 1, padding: "8px 12px", fontSize: "12px",
            background: "oklch(0.14 0.006 230)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)", color: "var(--foreground)",
            fontFamily: "var(--font-sans), sans-serif", outline: "none",
          }}
        />
        <button onClick={create} disabled={creating || !name.trim()} style={{
          padding: "8px 16px", fontSize: "12px", fontWeight: 700,
          background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
          color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
          cursor: creating || !name.trim() ? "default" : "pointer",
          fontFamily: "var(--font-sans), sans-serif",
          opacity: creating || !name.trim() ? 0.6 : 1,
        }}>
          {creating ? "Creating…" : "Create"}
        </button>
      </div>

      {/* Newly created key reveal */}
      {newKey && (
        <div style={{
          background: "var(--success-bg)", border: "1px solid var(--success)",
          borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
              Copy your key now — it won&apos;t be shown again
            </div>
            <code style={{ fontSize: "12px", color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{newKey}</code>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={copy} style={{
              padding: "6px 12px", fontSize: "11px", fontWeight: 700,
              background: copied ? "var(--success)" : "oklch(0.20 0.02 145)",
              color: "var(--success)", border: "1px solid var(--success)",
              borderRadius: "var(--radius)", cursor: "pointer",
              fontFamily: "var(--font-sans), sans-serif",
            }}>{copied ? "Copied!" : "Copy"}</button>
            <button onClick={() => setNewKey(null)} style={{
              padding: "6px 10px", fontSize: "11px", background: "transparent",
              color: "var(--foreground-3)", border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius)", cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Keys table */}
      {keys.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--foreground-3)", textAlign: "center", padding: "20px" }}>
          No API keys yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {keys.map(k => (
            <div key={k.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "oklch(0.13 0.006 230)",
              borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)",
            }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>{k.name}</div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  {k.keyPrefix}…
                  {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                </div>
              </div>
              <button onClick={() => revoke(k.id)} style={{
                padding: "4px 10px", fontSize: "10px", fontWeight: 600,
                background: "transparent", color: "var(--destructive)",
                border: "1px solid oklch(0.65 0.20 27 / 0.3)", borderRadius: "var(--radius)",
                cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
              }}>Revoke</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
