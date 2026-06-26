import Link from "next/link"

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "48px 24px",
        fontFamily: "var(--font-sans)",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 560 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            fontSize: 18,
            fontWeight: 800,
            color: "white",
            marginBottom: 24,
          }}
        >
          Rk
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            marginBottom: 12,
            background: "linear-gradient(135deg, var(--foreground), oklch(0.65 0.13 196))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          RankIQ
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--foreground-2)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          SEO co-pilot for business owners. Unified AI-powered analysis across all
          6 SEO disciplines — so you fix what matters, not what looks impressive.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            href="/login"
            style={{
              padding: "10px 24px",
              borderRadius: "var(--radius)",
              background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
              color: "white",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
          <a
            href="/api/health"
            style={{
              padding: "10px 24px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              color: "var(--foreground-2)",
              fontWeight: 500,
              fontSize: 14,
              textDecoration: "none",
              fontFamily: "var(--font-mono)",
            }}
          >
            /health →
          </a>
        </div>
      </div>
    </main>
  )
}
