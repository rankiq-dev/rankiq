"use client"
import Link from "next/link"

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main style={{
      minHeight: "100vh", background: "oklch(0.08 0.010 230)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-sans), sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "14px",
          background: "var(--destructive-bg, oklch(0.14 0.07 27))",
          border: "1px solid oklch(0.65 0.20 27 / 0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", fontSize: "24px",
        }}>⚠</div>

        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "oklch(0.88 0.008 230)", marginBottom: "10px" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "13px", color: "oklch(0.50 0.008 230)", lineHeight: 1.7, marginBottom: "28px", maxWidth: "360px" }}>
          An unexpected error occurred. The team has been notified.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={reset} style={{
            padding: "10px 22px", fontSize: "13px", fontWeight: 700,
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            color: "white", borderRadius: "8px", border: "none", cursor: "pointer",
            fontFamily: "var(--font-sans), sans-serif",
          }}>Try again</button>
          <Link href="/dashboard" style={{
            padding: "10px 20px", fontSize: "13px", fontWeight: 600,
            background: "oklch(0.98 0 0 / 0.04)", color: "oklch(0.60 0.008 230)",
            border: "1px solid oklch(0.98 0 0 / 0.08)", borderRadius: "8px", textDecoration: "none",
            display: "inline-flex", alignItems: "center",
          }}>Dashboard</Link>
        </div>
      </div>
    </main>
  )
}
