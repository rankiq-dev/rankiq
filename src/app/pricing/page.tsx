import { auth } from "@/auth"
import Link from "next/link"
import type { Metadata } from "next"
import { PLAN_LIMITS } from "@/lib/constants"

export const metadata: Metadata = { title: "Pricing" }

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
      "Technical SEO audit",
      "On-page analysis",
      "AI action plan",
    ],
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: 79,
    description: "For growing businesses managing multiple properties.",
    cta: "Upgrade to Growth",
    highlight: true,
    features: [
      `${PLAN_LIMITS.growth.sites} sites`,
      `${PLAN_LIMITS.growth.pagesPerCrawl} pages per crawl`,
      `${PLAN_LIMITS.growth.auditsPerMonth} audits / month`,
      "Everything in Starter",
      "Google Search Console integration",
      "Weekly email reports",
      "Progress tracking",
    ],
  },
  {
    id: "agency" as const,
    name: "Agency",
    price: 199,
    description: "For agencies managing SEO across client portfolios.",
    cta: "Upgrade to Agency",
    highlight: false,
    features: [
      `${PLAN_LIMITS.agency.sites} sites`,
      `${PLAN_LIMITS.agency.pagesPerCrawl} pages per crawl`,
      `${PLAN_LIMITS.agency.auditsPerMonth} audits / month`,
      "Everything in Growth",
      "Priority support",
      "Custom branding (coming soon)",
    ],
  },
] as const

export default async function PricingPage() {
  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "oklch(0.10 0.008 230)",
        padding: "60px 24px 80px",
        fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.55 0.13 178 / 0.10), transparent)",
        }}
      />

      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", marginBottom: "32px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))" }} />
            <span style={{ fontSize: "18px", fontWeight: 800, background: "linear-gradient(135deg, oklch(0.75 0.13 178), oklch(0.80 0.13 196))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.4px" }}>RankIQ</span>
          </Link>
          <h1
            style={{
              fontSize: "40px",
              fontWeight: 800,
              color: "oklch(0.92 0.008 230)",
              letterSpacing: "-1px",
              lineHeight: 1.1,
              marginBottom: "16px",
            }}
          >
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: "16px", color: "oklch(0.65 0.008 230)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            Pick the plan that fits your business. Upgrade or cancel any time.
          </p>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", alignItems: "start" }}>
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      </div>
    </main>
  )
}

function PlanCard({
  plan,
  isLoggedIn,
}: {
  plan: (typeof PLANS)[number]
  isLoggedIn: boolean
}) {
  const glowBorder = plan.highlight
    ? "1px solid oklch(0.55 0.13 178 / 0.5)"
    : "1px solid oklch(0.98 0 0 / 0.06)"

  return (
    <div
      style={{
        background: plan.highlight ? "oklch(0.13 0.010 195 / 0.70)" : "oklch(0.12 0.008 230 / 0.60)",
        backdropFilter: "blur(20px) saturate(1.4)",
        border: glowBorder,
        borderRadius: "14px",
        padding: "28px",
        boxShadow: plan.highlight
          ? "0 0 0 1px oklch(0.55 0.13 178 / 0.2), 0 0 32px oklch(0.55 0.13 178 / 0.12), 0 8px 24px oklch(0 0 0 / 0.4)"
          : "0 0 0 1px oklch(0.98 0 0 / 0.06), 0 8px 24px oklch(0 0 0 / 0.4)",
        position: "relative",
      }}
    >
      {plan.highlight && (
        <div
          style={{
            position: "absolute",
            top: "-1px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "3px 10px",
            background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
            borderRadius: "0 0 8px 8px",
            fontSize: "10px",
            fontWeight: 700,
            color: "oklch(0.98 0.005 230)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Most popular
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "oklch(0.65 0.13 178)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
          {plan.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "oklch(0.92 0.008 230)", letterSpacing: "-1px", fontFamily: "var(--font-mono)" }}>
            {plan.price === 0 ? "Free" : `$${plan.price}`}
          </span>
          {plan.price > 0 && <span style={{ fontSize: "13px", color: "oklch(0.38 0.008 230)" }}>/mo</span>}
        </div>
        <p style={{ fontSize: "12px", color: "oklch(0.65 0.008 230)", lineHeight: 1.5 }}>
          {plan.description}
        </p>
      </div>

      {/* CTA */}
      {plan.id === "starter" ? (
        <Link
          href={isLoggedIn ? "/dashboard" : "/login"}
          style={{
            display: "block",
            textAlign: "center",
            padding: "10px",
            background: "oklch(0.22 0.006 230)",
            color: "oklch(0.92 0.008 230)",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: "20px",
          }}
        >
          {isLoggedIn ? "Current plan" : plan.cta}
        </Link>
      ) : (
        <form action={`/api/v1/billing/checkout`} method="post" style={{ marginBottom: "20px" }}>
          <input type="hidden" name="plan" value={plan.id} />
          {isLoggedIn ? (
            <CheckoutButton plan={plan.id} label={plan.cta} highlight={plan.highlight} />
          ) : (
            <Link
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px",
                background: plan.highlight
                  ? "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))"
                  : "oklch(0.22 0.006 230)",
                color: "oklch(0.98 0.005 230)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {plan.cta}
            </Link>
          )}
        </form>
      )}

      {/* Features */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "oklch(0.65 0.008 230)" }}>
            <span style={{ color: "oklch(0.65 0.13 178)", fontSize: "11px" }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CheckoutButton({ plan, label, highlight }: { plan: string; label: string; highlight: boolean }) {
  return (
    <button
      type="submit"
      formAction={async () => {
        "use server"
      }}
      style={{
        width: "100%",
        padding: "10px",
        background: highlight
          ? "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))"
          : "oklch(0.22 0.006 230)",
        color: "oklch(0.98 0.005 230)",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      {label}
    </button>
  )
}
