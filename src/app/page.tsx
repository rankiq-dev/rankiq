import Link from "next/link"

export default function LandingPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "oklch(0.08 0.010 230)",
      color: "oklch(0.92 0.008 230)",
      fontFamily: "var(--font-sans), sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Background gradients */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.55 0.13 178 / 0.15), transparent)",
      }} />
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 60% at 80% 80%, oklch(0.55 0.13 196 / 0.06), transparent)",
      }} />

      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid oklch(0.98 0 0 / 0.06)",
        background: "oklch(0.08 0.010 230 / 0.85)", backdropFilter: "blur(20px)",
        padding: "0 40px",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "7px",
              background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
              boxShadow: "0 0 12px oklch(0.55 0.13 178 / 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="white" fillOpacity="0.9"/>
                <path d="M7 4L10 7L7 10L4 7L7 4Z" fill="oklch(0.08 0.010 230)"/>
              </svg>
            </div>
            <span style={{
              fontSize: "17px", fontWeight: 800,
              background: "linear-gradient(135deg, oklch(0.82 0.13 178), oklch(0.88 0.13 196))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.4px",
            }}>RankIQ</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link href="/pricing" style={{ padding: "7px 14px", fontSize: "13px", fontWeight: 500, color: "oklch(0.65 0.008 230)", textDecoration: "none" }}>
              Pricing
            </Link>
            <Link href="/login" style={{
              padding: "7px 16px", fontSize: "13px", fontWeight: 700,
              background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
              color: "white", borderRadius: "8px", textDecoration: "none",
              boxShadow: "0 0 16px oklch(0.55 0.13 178 / 0.3)",
            }}>Sign in →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "100px 40px 80px", textAlign: "center", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 14px", borderRadius: "20px",
          background: "oklch(0.55 0.13 178 / 0.12)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
          fontSize: "12px", fontWeight: 600, color: "oklch(0.75 0.13 196)",
          marginBottom: "28px", letterSpacing: "0.02em",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "oklch(0.65 0.13 196)", display: "inline-block" }} />
          AI-Powered SEO Platform
        </div>

        <h1 style={{
          fontSize: "clamp(36px, 6vw, 68px)", fontWeight: 900,
          letterSpacing: "-2px", lineHeight: 1.05, marginBottom: "24px",
          background: "linear-gradient(135deg, oklch(0.95 0.005 230) 0%, oklch(0.75 0.13 196) 60%, oklch(0.65 0.13 178) 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Your SEO Co-pilot.<br />Powered by Claude AI.
        </h1>

        <p style={{
          fontSize: "18px", color: "oklch(0.65 0.008 230)", lineHeight: 1.7,
          maxWidth: "600px", margin: "0 auto 40px",
        }}>
          RankIQ crawls your site, identifies critical SEO issues across 6 disciplines, and generates a plain-English action plan ranked by revenue impact — in minutes.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" style={{
            padding: "14px 32px", fontSize: "15px", fontWeight: 700,
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            color: "white", borderRadius: "10px", textDecoration: "none",
            boxShadow: "0 0 32px oklch(0.55 0.13 178 / 0.4)",
          }}>Start for free →</Link>
          <Link href="/pricing" style={{
            padding: "14px 28px", fontSize: "15px", fontWeight: 600,
            background: "oklch(0.98 0 0 / 0.05)", color: "oklch(0.75 0.008 230)",
            border: "1px solid oklch(0.98 0 0 / 0.10)", borderRadius: "10px", textDecoration: "none",
          }}>View pricing</Link>
        </div>

        <p style={{ fontSize: "12px", color: "oklch(0.38 0.008 230)", marginTop: "16px" }}>
          Free to start · No credit card required
        </p>
      </section>

      {/* Features Grid */}
      <section style={{ padding: "0 40px 100px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.8px", color: "oklch(0.92 0.008 230)", marginBottom: "12px" }}>
            Everything your SEO needs
          </h2>
          <p style={{ fontSize: "15px", color: "oklch(0.55 0.008 230)", maxWidth: "480px", margin: "0 auto" }}>
            One platform. 6 SEO disciplines. AI-generated fixes.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {[
            { icon: "◎", title: "Smart Crawler", desc: "Crawls up to 500 pages per audit. Handles static and JavaScript-rendered sites via Playwright fallback." },
            { icon: "✦", title: "AI Action Plan", desc: "Claude AI ranks every issue by estimated revenue impact and writes plain-English step-by-step fix instructions." },
            { icon: "◈", title: "19 SEO Rules", desc: "Technical, on-page, off-page, local, e-commerce, and content issues detected in a single crawl run." },
            { icon: "⬡", title: "Keyword Tracking", desc: "Connect Google Search Console and track keyword positions with week-over-week movement arrows." },
            { icon: "▣", title: "Agency Dashboard", desc: "Manage all client sites in one portfolio overview. Health distribution, critical alerts, bulk reporting." },
            { icon: "↓", title: "PDF Reports", desc: "One-click PDF export with your score ring, issue list, and AI fix instructions — ready to share with clients." },
            { icon: "vs", title: "Competitor Analysis", desc: "Compare any two sites on-page SEO signals side-by-side. Spot gaps in title, schema, content, and structure." },
            { icon: "⏱", title: "Auto Weekly Audits", desc: "Growth and Agency plans get fully automated weekly crawls — no manual triggers needed. Always fresh data." },
          ].map(f => (
            <div key={f.title} style={{
              background: "oklch(0.11 0.008 230 / 0.80)", backdropFilter: "blur(20px)",
              border: "1px solid oklch(0.98 0 0 / 0.06)", borderRadius: "14px",
              padding: "24px", position: "relative", overflow: "hidden",
            }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "oklch(0.55 0.13 178 / 0.12)", border: "1px solid oklch(0.55 0.13 178 / 0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", color: "oklch(0.65 0.13 196)", marginBottom: "14px",
              }}>{f.icon}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "oklch(0.92 0.008 230)", marginBottom: "6px" }}>{f.title}</div>
              <div style={{ fontSize: "13px", color: "oklch(0.55 0.008 230)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / CTA */}
      <section style={{
        background: "oklch(0.11 0.008 230 / 0.8)", borderTop: "1px solid oklch(0.98 0 0 / 0.06)",
        borderBottom: "1px solid oklch(0.98 0 0 / 0.06)",
        padding: "80px 40px", textAlign: "center",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.8px", color: "oklch(0.92 0.008 230)", marginBottom: "16px" }}>
            Start your free audit today
          </h2>
          <p style={{ fontSize: "15px", color: "oklch(0.55 0.008 230)", lineHeight: 1.7, marginBottom: "32px" }}>
            No credit card. No setup. Add your domain and get a full SEO audit with an AI action plan in under 5 minutes.
          </p>
          <Link href="/login" style={{
            display: "inline-block",
            padding: "14px 40px", fontSize: "15px", fontWeight: 700,
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            color: "white", borderRadius: "10px", textDecoration: "none",
            boxShadow: "0 0 32px oklch(0.55 0.13 178 / 0.4)",
          }}>Get started free →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 40px", borderTop: "1px solid oklch(0.98 0 0 / 0.06)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "oklch(0.55 0.13 196)" }}>RankIQ</span>
            <span style={{ fontSize: "12px", color: "oklch(0.38 0.008 230)" }}>AI-Powered SEO Platform</span>
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link href="/pricing" style={{ fontSize: "12px", color: "oklch(0.45 0.008 230)", textDecoration: "none" }}>Pricing</Link>
            <Link href="/login" style={{ fontSize: "12px", color: "oklch(0.45 0.008 230)", textDecoration: "none" }}>Login</Link>
            <a href="/api/health" style={{ fontSize: "12px", color: "oklch(0.45 0.008 230)", textDecoration: "none" }}>Status</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
