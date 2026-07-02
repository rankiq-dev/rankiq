export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import Link from "next/link"
import type { Metadata } from "next"
import { PLAN_LIMITS } from "@/lib/constants"

export const metadata: Metadata = { title: "Pricing — RankIQ" }

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: 0,
    description: "Get started with SEO insights for one site.",
    cta: "Start free",
    href: "/login",
    highlight: false,
    features: [
      `${PLAN_LIMITS.starter.sites} site`,
      `${PLAN_LIMITS.starter.pagesPerCrawl} pages per crawl`,
      `${PLAN_LIMITS.starter.auditsPerMonth} audits / month`,
      "Full technical SEO audit",
      "On-page analysis",
      "AI action plan",
      "PDF report export",
      "Competitor analysis",
    ],
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: 19,
    description: "For growing businesses managing multiple properties.",
    cta: "Upgrade to Growth",
    highlight: true,
    features: [
      `Up to ${PLAN_LIMITS.growth.sites} sites`,
      `${PLAN_LIMITS.growth.pagesPerCrawl} pages per crawl`,
      `${PLAN_LIMITS.growth.auditsPerMonth} audits / month`,
      "Everything in Starter",
      "Google Search Console integration",
      "Keyword position tracking",
      "Weekly auto-audits",
      "Position change tracking",
    ],
  },
  {
    id: "agency" as const,
    name: "Agency",
    price: 49,
    description: "For agencies managing SEO across client portfolios.",
    cta: "Upgrade to Agency",
    highlight: false,
    features: [
      `Up to ${PLAN_LIMITS.agency.sites} sites`,
      `${PLAN_LIMITS.agency.pagesPerCrawl} pages per crawl`,
      `${PLAN_LIMITS.agency.auditsPerMonth} audits / month`,
      "Everything in Growth",
      "Agency portfolio dashboard",
      "Bulk audit triggers",
      "Priority support",
      "White-label reports (coming soon)",
    ],
  },
] as const

const FAQ = [
  { q: "Can I cancel anytime?", a: "Yes — cancel your subscription at any time. You keep access until the end of your billing period." },
  { q: "What happens to my data if I downgrade?", a: "Your audits and sites are preserved. You just lose access to features above your plan tier." },
  { q: "Do you support JavaScript-rendered sites?", a: "Yes. RankIQ automatically falls back to a Playwright-powered headless browser if the standard crawler returns 0 pages." },
  { q: "How does Google Search Console integration work?", a: "You connect your GSC account from the site settings page. RankIQ imports your top 25 keywords and tracks position changes weekly." },
]

export default async function PricingPage() {
  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <main style={{
      minHeight: "100vh",
      background: "oklch(0.08 0.010 230)",
      fontFamily: "var(--font-sans), sans-serif",
      position: "relative",
    }}>
      {/* Backgrounds */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.55 0.13 178 / 0.12), transparent)",
      }} />

      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid oklch(0.98 0 0 / 0.06)",
        background: "oklch(0.08 0.010 230 / 0.85)", backdropFilter: "blur(20px)",
        padding: "0 40px",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
            <div style={{
              width: "27px", height: "27px", borderRadius: "7px",
              background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
              boxShadow: "0 0 12px oklch(0.55 0.13 178 / 0.4)",
            }} />
            <span style={{
              fontSize: "17px", fontWeight: 800,
              background: "linear-gradient(135deg, oklch(0.82 0.13 178), oklch(0.88 0.13 196))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.4px",
            }}>RankIQ</span>
          </Link>
          <Link href={isLoggedIn ? "/dashboard" : "/login"} style={{
            padding: "7px 16px", fontSize: "13px", fontWeight: 700,
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            color: "white", borderRadius: "8px", textDecoration: "none",
            boxShadow: "0 0 14px oklch(0.55 0.13 178 / 0.3)",
          }}>
            {isLoggedIn ? "Dashboard" : "Sign in →"}
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "72px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "4px 14px", borderRadius: "20px", marginBottom: "20px",
            background: "oklch(0.55 0.13 178 / 0.10)", border: "1px solid oklch(0.55 0.13 178 / 0.25)",
            fontSize: "11px", fontWeight: 700, color: "oklch(0.75 0.13 196)", letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            Transparent Pricing
          </div>
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900,
            letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: "18px",
            background: "linear-gradient(135deg, oklch(0.95 0.005 230) 0%, oklch(0.75 0.13 196) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Simple plans. No surprises.
          </h1>
          <p style={{ fontSize: "16px", color: "oklch(0.55 0.008 230)", maxWidth: "500px", margin: "0 auto", lineHeight: 1.7 }}>
            Start free. Upgrade when you need more. Cancel any time — no contracts.
          </p>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(295px, 1fr))", gap: "16px", alignItems: "stretch", marginBottom: "80px" }}>
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>

        {/* Feature comparison table */}
        <div style={{ marginBottom: "80px", overflowX: "auto" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.5px", marginBottom: "24px", textAlign: "center" }}>
            Compare plans
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "oklch(0.55 0.008 230)", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid oklch(0.98 0 0 / 0.08)" }}>Feature</th>
                {["Starter", "Growth", "Agency"].map(p => (
                  <th key={p} style={{ padding: "10px 16px", textAlign: "center", color: p === "Growth" ? "oklch(0.75 0.13 196)" : "oklch(0.80 0.008 230)", fontWeight: 800, fontSize: "13px", borderBottom: "1px solid oklch(0.98 0 0 / 0.08)" }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Sites", "1", "10", "50"],
                ["Pages per crawl", "50", "200", "500"],
                ["Audits / month", "5", "30", "Unlimited"],
                ["Technical SEO audit", "✓", "✓", "✓"],
                ["AI action plan", "✓", "✓", "✓"],
                ["PDF report export", "✓", "✓", "✓"],
                ["CSV issue export", "✓", "✓", "✓"],
                ["Competitor analysis", "✓", "✓", "✓"],
                ["Quick Scan tool", "✓", "✓", "✓"],
                ["Share audit links", "✓", "✓", "✓"],
                ["Weekly auto-audits", "—", "✓", "✓"],
                ["Google Search Console", "—", "✓", "✓"],
                ["Score history charts", "—", "✓", "✓"],
                ["Agency portfolio view", "—", "—", "✓"],
                ["Client labels", "—", "—", "✓"],
                ["Bulk audit triggers", "—", "—", "✓"],
                ["API access", "—", "—", "✓"],
                ["Priority support", "—", "—", "✓"],
              ].map(([feature, ...vals], i) => (
                <tr key={feature} style={{ background: i % 2 === 0 ? "oklch(0.11 0.008 230 / 0.4)" : "transparent" }}>
                  <td style={{ padding: "10px 16px", color: "oklch(0.72 0.008 230)", borderBottom: "1px solid oklch(0.98 0 0 / 0.04)" }}>{feature}</td>
                  {vals.map((v, vi) => (
                    <td key={vi} style={{ padding: "10px 16px", textAlign: "center", borderBottom: "1px solid oklch(0.98 0 0 / 0.04)", color: v === "—" ? "oklch(0.35 0.008 230)" : v === "✓" ? "oklch(0.72 0.13 178)" : "oklch(0.85 0.008 230)", fontWeight: v === "—" ? 400 : 700 }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Competitor comparison callout */}
        <div style={{
          maxWidth: "700px", margin: "0 auto 60px",
          background: "oklch(0.55 0.13 178 / 0.07)", border: "1px solid oklch(0.55 0.13 178 / 0.2)",
          borderRadius: "16px", padding: "28px 32px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "oklch(0.75 0.13 196)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            How we compare
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
            {[
              { tool: "Semrush", price: "$130", plan: "Starter", badge: "💸 7× more" },
              { tool: "Ahrefs", price: "$129", plan: "Lite", badge: "💸 7× more" },
              { tool: "SE Ranking", price: "$52", plan: "Essential", badge: "💸 3× more" },
              { tool: "RankIQ", price: "$19", plan: "Growth", badge: "✅ You save 85%", highlight: true },
            ].map(c => (
              <div key={c.tool} style={{
                padding: "14px 16px", borderRadius: "10px",
                background: c.highlight ? "oklch(0.55 0.13 178 / 0.15)" : "oklch(0.14 0.006 230)",
                border: `1px solid ${c.highlight ? "oklch(0.55 0.13 178 / 0.4)" : "oklch(0.98 0 0 / 0.06)"}`,
              }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: c.highlight ? "oklch(0.82 0.13 178)" : "oklch(0.70 0.008 230)", marginBottom: "4px" }}>{c.tool}</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: c.highlight ? "oklch(0.92 0.008 230)" : "oklch(0.55 0.008 230)", letterSpacing: "-0.5px", marginBottom: "4px" }}>{c.price}<span style={{ fontSize: "11px", fontWeight: 400 }}>/mo</span></div>
                <div style={{ fontSize: "10px", color: "oklch(0.45 0.008 230)", marginBottom: "6px" }}>{c.plan}</div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: c.highlight ? "oklch(0.65 0.16 155)" : "oklch(0.55 0.18 25)" }}>{c.badge}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "oklch(0.92 0.008 230)", letterSpacing: "-0.5px", marginBottom: "32px", textAlign: "center" }}>
            Common questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{
                background: "oklch(0.11 0.008 230 / 0.8)", backdropFilter: "blur(16px)",
                border: "1px solid oklch(0.98 0 0 / 0.06)", borderRadius: "12px",
                padding: "20px 24px",
              }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "oklch(0.88 0.008 230)", marginBottom: "8px" }}>{q}</div>
                <div style={{ fontSize: "13px", color: "oklch(0.55 0.008 230)", lineHeight: 1.7 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

function PlanCard({ plan, isLoggedIn }: { plan: (typeof PLANS)[number]; isLoggedIn: boolean }) {
  return (
    <div style={{
      background: plan.highlight ? "oklch(0.13 0.012 195 / 0.85)" : "oklch(0.11 0.008 230 / 0.80)",
      backdropFilter: "blur(20px)",
      border: plan.highlight ? "1px solid oklch(0.55 0.13 178 / 0.5)" : "1px solid oklch(0.98 0 0 / 0.07)",
      borderRadius: "16px",
      padding: "0",
      boxShadow: plan.highlight
        ? "0 0 0 1px oklch(0.55 0.13 178 / 0.15), 0 0 40px oklch(0.55 0.13 178 / 0.1), 0 16px 32px oklch(0 0 0 / 0.4)"
        : "0 0 0 1px oklch(0.98 0 0 / 0.06), 0 8px 24px oklch(0 0 0 / 0.3)",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top accent */}
      {plan.highlight && (
        <div style={{
          height: "2px",
          background: "linear-gradient(90deg, oklch(0.55 0.13 178), oklch(0.75 0.13 196), oklch(0.55 0.13 178))",
        }} />
      )}

      <div style={{ padding: "28px 28px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        {plan.highlight && (
          <div style={{
            alignSelf: "flex-start",
            padding: "3px 10px",
            background: "linear-gradient(135deg, oklch(0.55 0.13 178 / 0.3), oklch(0.65 0.13 196 / 0.3))",
            border: "1px solid oklch(0.65 0.13 196 / 0.4)",
            borderRadius: "20px",
            fontSize: "10px", fontWeight: 700, color: "oklch(0.75 0.13 196)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: "16px",
          }}>Most popular</div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
            {plan.name}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "10px" }}>
            <span style={{
              fontSize: "40px", fontWeight: 900, letterSpacing: "-1.5px",
              fontFamily: "var(--font-mono)",
              color: plan.highlight ? "oklch(0.92 0.008 230)" : "oklch(0.85 0.008 230)",
            }}>
              {plan.price === 0 ? "Free" : `$${plan.price}`}
            </span>
            {plan.price > 0 && <span style={{ fontSize: "13px", color: "oklch(0.38 0.008 230)", marginBottom: "4px" }}>/mo</span>}
          </div>
          {plan.price > 0 && (
            <div style={{ fontSize: "11px", color: "oklch(0.55 0.13 178)", fontWeight: 600, marginBottom: "8px" }}>
              vs Semrush ${plan.id === "growth" ? "130" : "500"}/mo · Ahrefs ${plan.id === "growth" ? "129" : "449"}/mo
            </div>
          )}
          <p style={{ fontSize: "12px", color: "oklch(0.50 0.008 230)", lineHeight: 1.6 }}>
            {plan.description}
          </p>
        </div>

        {/* CTA */}
        <div style={{ marginBottom: "24px" }}>
          {plan.id === "starter" ? (
            <Link href={isLoggedIn ? "/dashboard" : "/login"} style={{
              display: "block", textAlign: "center",
              padding: "11px", background: "oklch(0.20 0.006 230)",
              color: "oklch(0.82 0.008 230)", borderRadius: "10px",
              fontSize: "13px", fontWeight: 700, textDecoration: "none",
              border: "1px solid oklch(0.98 0 0 / 0.08)",
            }}>
              {isLoggedIn ? "Your current plan" : plan.cta}
            </Link>
          ) : (
            <>
              {isLoggedIn ? (
                <CheckoutButton planId={plan.id} label={plan.cta} highlight={plan.highlight} />
              ) : (
                <Link href="/login" style={{
                  display: "block", textAlign: "center",
                  padding: "11px",
                  background: plan.highlight
                    ? "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))"
                    : "oklch(0.20 0.006 230)",
                  color: "oklch(0.98 0.005 230)",
                  borderRadius: "10px", fontSize: "13px", fontWeight: 700, textDecoration: "none",
                  boxShadow: plan.highlight ? "0 0 20px oklch(0.55 0.13 178 / 0.35)" : "none",
                  border: plan.highlight ? "none" : "1px solid oklch(0.98 0 0 / 0.08)",
                }}>
                  {plan.cta}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Features */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "9px" }}>
          {plan.features.map((f) => (
            <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "9px", fontSize: "12px", color: "oklch(0.62 0.008 230)" }}>
              <span style={{ color: "var(--success)", fontSize: "11px", marginTop: "1px", flexShrink: 0 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CheckoutButton({ planId, label, highlight }: { planId: string; label: string; highlight: boolean }) {
  return (
    <form action="/api/v1/billing/checkout" method="post">
      <input type="hidden" name="plan" value={planId} />
      <button type="submit" style={{
        width: "100%", padding: "11px",
        background: highlight
          ? "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))"
          : "oklch(0.20 0.006 230)",
        color: "oklch(0.98 0.005 230)",
        border: highlight ? "none" : "1px solid oklch(0.98 0 0 / 0.08)",
        borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
        fontFamily: "var(--font-sans), sans-serif",
        boxShadow: highlight ? "0 0 20px oklch(0.55 0.13 178 / 0.35)" : "none",
      }}>
        {label}
      </button>
    </form>
  )
}
