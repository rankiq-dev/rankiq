"use client"
import { useState } from "react"

interface RobotsResult {
  robots: { url: string; accessible: boolean; status: number; content: string | null; issues: string[] }
  sitemap: { url: string; accessible: boolean; status: number; issues: string[] }
}

export function RobotsChecker({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RobotsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showContent, setShowContent] = useState(false)

  async function check() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/v1/sites/${siteId}/robots`)
      const data = await res.json() as { data?: RobotsResult; error?: string }
      if (data.data) setResult(data.data)
      else setError(data.error ?? "Check failed")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const StatusDot = ({ ok }: { ok: boolean }) => (
    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: ok ? "var(--success)" : "var(--destructive)", display: "inline-block", flexShrink: 0 }} />
  )

  return (
    <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: result ? "16px" : 0 }}>
        <div>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)", marginBottom: "2px" }}>Robots & Sitemap</h3>
          {!result && <p style={{ fontSize: "11px", color: "var(--foreground-3)" }}>Check robots.txt and sitemap.xml reachability</p>}
        </div>
        <button onClick={check} disabled={loading} style={{
          padding: "6px 14px", fontSize: "11px", fontWeight: 700,
          background: "var(--primary-soft)", color: "var(--primary-2)",
          border: "1px solid oklch(0.55 0.13 178 / 0.3)", borderRadius: "var(--radius-md)",
          cursor: loading ? "default" : "pointer", fontFamily: "var(--font-sans), sans-serif",
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? "Checking…" : result ? "Re-check" : "Check now"}
        </button>
      </div>

      {error && <div style={{ fontSize: "12px", color: "var(--destructive)", marginTop: "10px" }}>{error}</div>}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { label: "robots.txt", item: result.robots },
            { label: "sitemap.xml", item: result.sitemap },
          ].map(({ label, item }) => (
            <div key={label} style={{
              padding: "10px 14px", background: "oklch(0.13 0.006 230)",
              borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: item.issues.length > 0 ? "8px" : 0 }}>
                <StatusDot ok={item.accessible} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", flex: 1 }}>{label}</span>
                <span style={{ fontSize: "10px", color: "var(--foreground-3)", fontFamily: "var(--font-mono)" }}>HTTP {item.status || "—"}</span>
              </div>
              {item.issues.map((issue, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "6px",
                  fontSize: "11px", color: "var(--warning)", marginTop: "4px",
                }}>
                  <span style={{ marginTop: "1px" }}>⚠</span>
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          ))}

          {result.robots.content && (
            <div>
              <button onClick={() => setShowContent(v => !v)} style={{
                background: "transparent", border: "none", fontSize: "11px",
                color: "var(--foreground-3)", cursor: "pointer", padding: 0,
                fontFamily: "var(--font-sans), sans-serif",
              }}>
                {showContent ? "Hide" : "View"} robots.txt content ↓
              </button>
              {showContent && (
                <pre style={{
                  marginTop: "8px", padding: "12px", background: "oklch(0.12 0.006 230)",
                  borderRadius: "var(--radius)", fontSize: "10px", color: "var(--foreground-2)",
                  overflow: "auto", maxHeight: "200px", fontFamily: "var(--font-mono)",
                  border: "1px solid var(--glass-border)",
                }}>
                  {result.robots.content}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
