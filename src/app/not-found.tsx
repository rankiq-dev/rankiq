import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "404 — Not Found" }

export default function NotFound() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "oklch(0.08 0.010 230)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-sans), sans-serif",
      position: "relative",
    }}>
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.55 0.13 178 / 0.08), transparent)",
      }} />

      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{
          fontSize: "100px", fontWeight: 900, lineHeight: 1,
          fontFamily: "var(--font-mono)",
          background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: "16px",
        }}>404</div>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "oklch(0.88 0.008 230)", marginBottom: "10px", letterSpacing: "-0.4px" }}>
          Page not found
        </h1>
        <p style={{ fontSize: "14px", color: "oklch(0.50 0.008 230)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "360px" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Link href="/dashboard" style={{
            padding: "10px 22px", fontSize: "13px", fontWeight: 700,
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            color: "white", borderRadius: "8px", textDecoration: "none",
            boxShadow: "0 0 16px oklch(0.55 0.13 178 / 0.3)",
          }}>Go to Dashboard</Link>
          <Link href="/" style={{
            padding: "10px 20px", fontSize: "13px", fontWeight: 600,
            background: "oklch(0.98 0 0 / 0.04)", color: "oklch(0.60 0.008 230)",
            border: "1px solid oklch(0.98 0 0 / 0.08)", borderRadius: "8px", textDecoration: "none",
          }}>Home</Link>
        </div>
      </div>
    </main>
  )
}
