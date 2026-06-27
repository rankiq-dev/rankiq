export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getAuditsForSite } from "@/db/repositories/audits"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Audit History" }

export default async function AuditsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; site?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { status: statusFilter, site: siteFilter } = await searchParams

  const sites = await getSitesByUser(session.user.id)

  // Get all audits for all sites, flattened
  const auditsBySite = await Promise.all(
    sites.map(async s => {
      const audits = await getAuditsForSite(s.id)
      return audits.map(a => ({ ...a, site: s }))
    })
  )

  const allAudits = auditsBySite
    .flat()
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 200)

  const filtered = allAudits.filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!siteFilter || a.site.id === siteFilter)
  )

  const statusCounts = {
    complete: allAudits.filter(a => a.status === "complete").length,
    running: allAudits.filter(a => a.status === "running").length,
    queued: allAudits.filter(a => a.status === "queued").length,
    failed: allAudits.filter(a => a.status === "failed").length,
  }

  const statusColor = (s: string) => {
    if (s === "complete") return "var(--success)"
    if (s === "running") return "var(--primary-2)"
    if (s === "queued") return "var(--warning)"
    return "var(--destructive)"
  }

  const statusBg = (s: string) => {
    if (s === "complete") return "var(--success-bg)"
    if (s === "running") return "var(--primary-soft)"
    if (s === "queued") return "var(--warning-bg)"
    return "var(--destructive-bg)"
  }

  const scoreColor = (score: number | null) => {
    if (score == null) return "var(--foreground-3)"
    return score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--destructive)"
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1000px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.5px", marginBottom: "4px" }}>Audit History</h1>
          <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>{filtered.length} of {allAudits.length} audits across {sites.length} site{sites.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/sites/new" style={{
          padding: "9px 18px", fontSize: "13px", fontWeight: 700,
          background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
          color: "var(--primary-foreground)", borderRadius: "var(--radius-md)",
          textDecoration: "none", boxShadow: "var(--shadow-glow)",
        }}>+ New Audit</Link>
      </div>

      {/* Filter pills */}
      {allAudits.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
          {[
            { label: "All", value: null },
            { label: `Complete (${statusCounts.complete})`, value: "complete" },
            ...(statusCounts.running > 0 ? [{ label: `Running (${statusCounts.running})`, value: "running" }] : []),
            ...(statusCounts.queued > 0 ? [{ label: `Queued (${statusCounts.queued})`, value: "queued" }] : []),
            ...(statusCounts.failed > 0 ? [{ label: `Failed (${statusCounts.failed})`, value: "failed" }] : []),
          ].map(pill => {
            const active = pill.value === (statusFilter ?? null)
            return (
              <Link key={pill.label} href={pill.value ? `/audits?status=${pill.value}` : "/audits"} style={{
                padding: "4px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
                textDecoration: "none", textTransform: "capitalize",
                background: active ? "var(--primary-soft)" : "transparent",
                color: active ? "var(--primary-2)" : "var(--foreground-3)",
                border: active ? "1px solid oklch(0.55 0.13 178 / 0.3)" : "1px solid var(--glass-border)",
              }}>{pill.label}</Link>
            )
          })}
        </div>
      )}

      {allAudits.length === 0 ? (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "60px 40px", textAlign: "center",
        }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>◎</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>No audits yet</div>
          <Link href="/sites/new" style={{
            display: "inline-block", marginTop: "4px",
            padding: "9px 20px", fontSize: "13px", fontWeight: 700,
            background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
            color: "var(--primary-foreground)", borderRadius: "var(--radius-md)", textDecoration: "none",
          }}>Run your first audit →</Link>
        </div>
      ) : (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                {["Site", "Date", "Status", "Score", "Pages", "Issues", ""].map(h => (
                  <th key={h} style={{
                    padding: "10px 20px", textAlign: "left",
                    fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((audit, i) => (
                <tr key={audit.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid oklch(0.98 0 0 / 0.04)" : "none" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <Link href={`/sites/${audit.site.id}`} style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", textDecoration: "none" }}>
                      {audit.site.domain}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "12px", color: "var(--foreground-3)", whiteSpace: "nowrap" }}>
                    {audit.createdAt ? new Date(audit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      padding: "3px 8px", borderRadius: "20px",
                      background: statusBg(audit.status), fontSize: "11px",
                      fontWeight: 700, color: statusColor(audit.status),
                      textTransform: "capitalize",
                    }}>
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: statusColor(audit.status) }} />
                      {audit.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-mono)", color: scoreColor(audit.healthScore) }}>
                    {audit.healthScore ?? "—"}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>
                    {audit.pagesCount ?? "—"}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>
                    {(audit as { issueCount?: number }).issueCount ?? "—"}
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    {audit.status === "complete" && (
                      <Link href={`/audits/${audit.id}`} style={{
                        fontSize: "12px", fontWeight: 600, color: "var(--primary)",
                        textDecoration: "none",
                      }}>View →</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
