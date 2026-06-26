import { auth } from "@/auth"
import { getUserById } from "@/db/repositories/users"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite } from "@/db/repositories/audits"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { Site, Audit } from "@/db/schema"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [user, sites] = await Promise.all([
    getUserById(session.user.id),
    getSitesByUser(session.user.id),
  ])
  /* Fetch latest audit for each site in parallel — gives us health scores for cards */
  const latestAudits = sites.length > 0
    ? await Promise.all(sites.map((s) => getLatestAuditForSite(s.id)))
    : []

  if (!user) redirect("/login")

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1100px" }}>
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "oklch(0.92 0.008 230)",
            letterSpacing: "-0.5px",
            marginBottom: "6px",
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: "13px", color: "oklch(0.65 0.008 230)" }}>
          Welcome back{user.name ? `, ${user.name}` : ""}. Here&apos;s your SEO overview.
        </p>
      </div>

      {/* Plan badge */}
      <div style={{ marginBottom: "32px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            background: "oklch(0.18 0.06 178)",
            border: "1px solid oklch(0.55 0.13 178 / 0.3)",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            color: "oklch(0.75 0.13 178)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "oklch(0.65 0.13 196)" }} />
          {user.plan} plan
        </span>
      </div>

      {sites.length === 0 ? (
        <EmptyState />
      ) : (
        <SiteList sites={sites} latestAudits={latestAudits} />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        background: "oklch(0.12 0.008 230 / 0.60)",
        backdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid oklch(0.98 0 0 / 0.06)",
        borderRadius: "14px",
        padding: "64px 40px",
        textAlign: "center",
        maxWidth: "480px",
        boxShadow: "0 0 0 1px oklch(0.98 0 0 / 0.06), 0 8px 24px oklch(0 0 0 / 0.5)",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          background: "oklch(0.18 0.06 178)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "24px",
        }}
      >
        🌐
      </div>
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "oklch(0.92 0.008 230)",
          marginBottom: "8px",
          letterSpacing: "-0.3px",
        }}
      >
        No sites added yet
      </h2>
      <p
        style={{
          fontSize: "13px",
          color: "oklch(0.65 0.008 230)",
          lineHeight: 1.6,
          marginBottom: "28px",
        }}
      >
        Add your website to get started. RankIQ will crawl it and surface the top issues hurting your rankings.
      </p>
      <Link
        href="/sites/new"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 20px",
          background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
          color: "oklch(0.98 0.005 230)",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 700,
          textDecoration: "none",
          letterSpacing: "-0.1px",
        }}
      >
        + Add your first site
      </Link>
    </div>
  )
}

function SiteList({ sites, latestAudits }: { sites: Site[]; latestAudits: (Audit | undefined)[] }) {
  return (
    <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {sites.map((site, i) => {
        const audit = latestAudits[i]
        const score = audit?.healthScore
        const scoreColor = score == null ? "oklch(0.38 0.008 230)"
          : score >= 80 ? "oklch(0.68 0.16 155)"
          : score >= 60 ? "oklch(0.78 0.15 75)"
          : "oklch(0.65 0.20 27)"
        const statusText = audit == null ? "No audits yet"
          : audit.status === "complete" ? `${audit.pagesCount ?? 0} pages crawled`
          : audit.status === "running" ? "Audit in progress…"
          : audit.status === "queued" ? "Audit queued…"
          : "Audit failed"

        return (
          <Link
            key={site.id}
            href={`/sites/${site.id}`}
            style={{
              display: "block",
              padding: "20px",
              background: "oklch(0.12 0.008 230 / 0.60)",
              border: "1px solid oklch(0.98 0 0 / 0.06)",
              borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "oklch(0.92 0.008 230)" }}>
                {site.displayName ?? site.domain}
              </div>
              {score != null && (
                <div style={{ fontSize: "20px", fontWeight: 900, color: scoreColor, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                  {score}
                </div>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "oklch(0.38 0.008 230)", marginBottom: "6px" }}>
              {site.domain}
            </div>
            <div style={{ fontSize: "11px", color: "oklch(0.45 0.008 230)" }}>
              {statusText}
            </div>
            {site.gscConnected && (
              <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 6px", background: "oklch(0.14 0.07 155 / 0.6)", borderRadius: "4px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "oklch(0.68 0.16 155)", display: "inline-block" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: "oklch(0.68 0.16 155)", textTransform: "uppercase", letterSpacing: "0.06em" }}>GSC</span>
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
