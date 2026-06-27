export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { QuickScanner } from "./QuickScanner"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Quick Scan" }

export default async function QuickScanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div style={{ padding: "32px 40px", maxWidth: "760px" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "3px 10px", borderRadius: "20px",
          background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
          fontSize: "9px", fontWeight: 700, color: "var(--primary-2)",
          textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px",
        }}>Instant</div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", marginBottom: "6px" }}>
          Quick Scan
        </h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.65 }}>
          Analyze any single URL in seconds — title, description, H1, word count, schema, and more.
          No crawl required.
        </p>
      </div>
      <QuickScanner />
    </div>
  )
}
