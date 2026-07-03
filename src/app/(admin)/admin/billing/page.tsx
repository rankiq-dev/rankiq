export const dynamic = "force-dynamic"
import type { Metadata } from "next"
import { getBillingOverview } from "@/db/repositories/admin"
import { StatCard } from "../StatCard"

export const metadata: Metadata = { title: "Admin · Billing" }

export default async function AdminBillingPage() {
  const billing = await getBillingOverview()

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1100px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>Billing</h1>
        <p style={{ fontSize: "13px", color: "oklch(0.55 0.008 25)", marginTop: "4px" }}>
          Estimated from plan tiers — not Stripe-verified, directional only
        </p>
      </div>

      <div style={{
        background: "linear-gradient(135deg, oklch(0.16 0.06 145 / 0.25), oklch(0.10 0.010 25))",
        border: "1px solid oklch(0.50 0.10 145 / 0.3)",
        borderRadius: "16px", padding: "28px 32px", marginBottom: "24px",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.60 0.10 145)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
          Estimated MRR
        </div>
        <div style={{ fontSize: "42px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "oklch(0.85 0.10 145)", letterSpacing: "-1px" }}>
          ${billing.mrrUsd.toLocaleString()}
        </div>
        <div style={{ fontSize: "12px", color: "oklch(0.55 0.008 25)", marginTop: "6px" }}>
          from {billing.activePaidUsers} paying user{billing.activePaidUsers !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <StatCard label="Starter (Free)" value={billing.usersByPlan.starter ?? 0} color="oklch(0.55 0.008 25)" sub="$0/mo" />
        <StatCard label="Growth ($19/mo)" value={billing.usersByPlan.growth ?? 0} color="oklch(0.65 0.15 220)" sub={`$${billing.revenueByPlan.growth}/mo`} />
        <StatCard label="Agency ($49/mo)" value={billing.usersByPlan.agency ?? 0} color="oklch(0.70 0.15 145)" sub={`$${billing.revenueByPlan.agency}/mo`} />
      </div>

      <div style={{
        background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
        borderRadius: "14px", padding: "18px 20px",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.55 0.008 25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
          Subscription Status Breakdown
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Object.entries(billing.subscriptionStatusCounts).map(([status, n]) => (
            <div key={status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "oklch(0.70 0.008 25)", textTransform: "capitalize" }}>{status}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
