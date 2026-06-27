export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { CompeteAnalyzer } from "./CompeteAnalyzer"

export const metadata: Metadata = { title: "Competitor Analysis" }

export default async function CompetePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "3px 10px", borderRadius: "20px",
            background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
            fontSize: "9px", fontWeight: 700, color: "var(--primary-2)",
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>Beta</span>
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", marginBottom: "6px", lineHeight: 1.1 }}>
          Competitor Analysis
        </h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.6 }}>
          Compare any two sites on-page SEO signals side-by-side. Spot gaps and opportunities instantly.
        </p>
      </div>

      <CompeteAnalyzer />
    </div>
  )
}
