"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewSitePage() {
  const router = useRouter()
  const [domain, setDomain] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"form" | "crawling">("form")

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
      const json = await res.json() as { error?: { message?: string }, data?: { site?: { id: string } } }

      if (!res.ok) {
        setError(json.error?.message ?? "Failed to add site.")
        setLoading(false)
        return
      }

      const siteId = json.data?.site?.id
      if (siteId) {
        setStep("crawling")
        await fetch("/api/v1/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        })
        router.push(`/sites/${siteId}`)
        router.refresh()
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  if (step === "crawling") {
    return (
      <div style={{ padding: "80px 40px", maxWidth: "520px", textAlign: "center" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "18px",
          background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", boxShadow: "0 0 32px var(--primary-glow)",
          fontSize: "28px", animation: "pulse 2s ease-in-out infinite",
        }}>◎</div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--foreground)", marginBottom: "10px", letterSpacing: "-0.5px" }}>
          Queuing your audit…
        </h2>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--primary-2)" }}>{domain}</strong> has been added.
          Our crawler is starting — you&apos;ll be redirected to the site page now.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: "40px", maxWidth: "560px" }}>
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "3px 10px", borderRadius: "20px",
          background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
          fontSize: "9px", fontWeight: 700, color: "var(--primary-2)",
          textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px",
        }}>New Site</div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", marginBottom: "8px" }}>
          Add a website
        </h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.65 }}>
          Enter your domain and RankIQ will crawl it, detect SEO issues, and generate an AI-powered action plan — automatically.
        </p>
      </div>

      {/* How it works */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "18px 20px", marginBottom: "28px", display: "flex", flexDirection: "column", gap: "10px",
      }}>
        {[
          { icon: "◎", label: "Crawl", desc: "We scan up to 100 pages of your site" },
          { icon: "◈", label: "Analyse", desc: "19 SEO rules checked per page" },
          { icon: "✦", label: "AI Plan", desc: "Claude ranks issues by revenue impact" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "var(--primary-soft)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              fontSize: "14px", color: "var(--primary-2)",
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }}>{s.label}</div>
              <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px" }}>
              Domain *
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
              style={inputStyle}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)" }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--glass-border)" }}
            />
            {domain.trim() && (
              <div style={{
                marginTop: "6px", padding: "7px 12px",
                background: "oklch(0.14 0.006 230)", borderRadius: "var(--radius-md)",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>Will crawl:</span>
                <code style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--primary-2)" }}>
                  https://{domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </code>
              </div>
            )}
            {!domain.trim() && (
              <p style={{ fontSize: "11px", color: "var(--foreground-3)", marginTop: "5px" }}>
                No https:// needed · e.g. esankalpam.com or blog.example.com
              </p>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px" }}>
              Display Name <span style={{ fontWeight: 400, color: "var(--foreground-3)" }}>Optional</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Client's Website"
              style={inputStyle}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)" }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--glass-border)" }}
            />
          </div>

          {error && (
            <div style={{
              padding: "12px 16px", background: "var(--destructive-bg)",
              border: "1px solid oklch(0.65 0.20 27 / 0.3)",
              borderRadius: "var(--radius-md)", fontSize: "13px", color: "var(--destructive)",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: "11px 18px", background: "var(--glass-bg)", color: "var(--foreground-2)",
                border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-sans), sans-serif",
              }}
            >Cancel</button>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              style={{
                flex: 1, padding: "11px 18px",
                background: loading || !domain.trim()
                  ? "oklch(0.28 0.06 178)"
                  : "linear-gradient(135deg, var(--primary), var(--primary-2))",
                color: "var(--primary-foreground)",
                border: "none", borderRadius: "var(--radius-md)",
                fontSize: "13px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans), sans-serif",
                boxShadow: loading || !domain.trim() ? "none" : "var(--shadow-glow)",
                opacity: !domain.trim() ? 0.6 : 1, transition: "all 200ms",
              }}
            >
              {loading ? "Adding site…" : "Add site + start audit →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--foreground)",
  fontSize: "14px",
  fontFamily: "var(--font-mono), monospace",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms",
}
