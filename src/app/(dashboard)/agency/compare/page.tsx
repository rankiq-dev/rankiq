export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getLatestAuditForSite, getIssuesByAudit } from "@/db/repositories/audits"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Compare Sites" }

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { a: siteAId, b: siteBId } = await searchParams
  const sites = await getSitesByUser(session.user.id)

  const siteA = siteAId ? sites.find(s => s.id === siteAId) : undefined
  const siteB = siteBId ? sites.find(s => s.id === siteBId) : undefined

  const [dataA, dataB] = await Promise.all([
    siteA ? (async () => {
      const audit = await getLatestAuditForSite(siteA.id)
      const issues = audit ? await getIssuesByAudit(audit.id, { limit: 200 }) : []
      return { site: siteA, audit, issues }
    })() : Promise.resolve(null),
    siteB ? (async () => {
      const audit = await getLatestAuditForSite(siteB.id)
      const issues = audit ? await getIssuesByAudit(audit.id, { limit: 200 }) : []
      return { site: siteB, audit, issues }
    })() : Promise.resolve(null),
  ])

  const CATEGORIES = ["technical", "on_page", "content", "links"] as const

  function scoreColor(s: number | null) {
    if (s == null) return "var(--foreground-3)"
    if (s >= 90) return "var(--success)"
    if (s >= 70) return "var(--primary-2)"
    if (s >= 50) return "var(--warning)"
    return "var(--destructive)"
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "28px" }}>
        <Link href="/agency" style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", display: "inline-block", marginBottom: "10px" }}>
          ← Agency Dashboard
        </Link>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.5px", marginBottom: "4px" }}>
          Compare Sites
        </h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>
          Select two sites to compare their SEO health side-by-side.
        </p>
      </div>

      {/* Site selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
        {(["a", "b"] as const).map((slot) => {
          const currentId = slot === "a" ? siteAId : siteBId
          const otherId = slot === "a" ? siteBId : siteAId
          return (
            <form key={slot} method="get" action="/agency/compare">
              {otherId && <input type="hidden" name={slot === "a" ? "b" : "a"} value={otherId} />}
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                Site {slot.toUpperCase()}
              </label>
              <select name={slot} defaultValue={currentId ?? ""} onChange={(e) => (e.target as HTMLSelectElement).form?.submit()}
                style={{
                  width: "100%", padding: "10px 12px", fontSize: "13px",
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)", color: "var(--foreground)",
                  fontFamily: "var(--font-sans), sans-serif", cursor: "pointer",
                }}>
                <option value="">-- Select a site --</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.displayName ?? s.domain}</option>
                ))}
              </select>
            </form>
          )
        })}
      </div>

      {/* Comparison table */}
      {dataA && dataB && (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", overflow: "hidden",
        }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--glass-border)" }}>
            <div style={{ padding: "16px 20px", fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Metric</div>
            {[dataA, dataB].map((d) => (
              <div key={d.site.id} style={{ padding: "16px 20px", borderLeft: "1px solid var(--glass-border)" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>{d.site.displayName ?? d.site.domain}</div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{d.site.domain}</div>
              </div>
            ))}
          </div>

          {/* Health Score */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--glass-border)" }}>
            <div style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--foreground-2)" }}>Health Score</div>
            {[dataA, dataB].map((d) => (
              <div key={d.site.id} style={{ padding: "14px 20px", borderLeft: "1px solid var(--glass-border)" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, fontFamily: "var(--font-mono)", color: scoreColor(d.audit?.healthScore ?? null) }}>
                  {d.audit?.healthScore ?? "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Pages crawled */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--glass-border)" }}>
            <div style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--foreground-2)" }}>Pages crawled</div>
            {[dataA, dataB].map((d) => (
              <div key={d.site.id} style={{ padding: "14px 20px", borderLeft: "1px solid var(--glass-border)", fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>
                {d.audit?.pagesCount ?? "—"}
              </div>
            ))}
          </div>

          {/* Issue counts */}
          {[
            { label: "Critical Issues", key: "critical" as const, color: "var(--destructive)" },
            { label: "Warnings", key: "warnings" as const, color: "var(--warning)" },
            { label: "Info", key: "info" as const, color: "var(--info)" },
          ].map(row => (
            <div key={row.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{ padding: "12px 20px", fontSize: "12px", fontWeight: 600, color: "var(--foreground-2)" }}>{row.label}</div>
              {[dataA, dataB].map((d) => {
                const val = d.issues.filter(i => i.severity === (row.key === "warnings" ? "warning" : row.key === "info" ? "info" : "critical")).length
                const other = (row.key === "critical"
                  ? (d === dataA ? dataB : dataA).issues.filter(i => i.severity === "critical")
                  : row.key === "warnings"
                    ? (d === dataA ? dataB : dataA).issues.filter(i => i.severity === "warning")
                    : (d === dataA ? dataB : dataA).issues.filter(i => i.severity === "info")).length
                const isBetter = val < other
                return (
                  <div key={d.site.id} style={{ padding: "12px 20px", borderLeft: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 700, color: row.color }}>{val}</span>
                    {val !== other && (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: isBetter ? "var(--success)" : "var(--foreground-3)" }}>
                        {isBetter ? "✓ Better" : ""}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Category breakdowns */}
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{ padding: "12px 20px", fontSize: "11px", fontWeight: 600, color: "var(--foreground-3)", textTransform: "capitalize" }}>{cat.replace("_", " ")} issues</div>
              {[dataA, dataB].map((d) => {
                const val = d.issues.filter(i => i.category === cat).length
                return (
                  <div key={d.site.id} style={{ padding: "12px 20px", borderLeft: "1px solid var(--glass-border)", fontSize: "12px", fontFamily: "var(--font-mono)", color: val > 0 ? "var(--foreground)" : "var(--foreground-3)" }}>
                    {val}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Footer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div style={{ padding: "12px 20px", fontSize: "10px", color: "var(--foreground-3)" }}>Last audit</div>
            {[dataA, dataB].map((d) => (
              <div key={d.site.id} style={{ padding: "12px 20px", borderLeft: "1px solid var(--glass-border)", fontSize: "11px", color: "var(--foreground-3)" }}>
                {d.audit?.completedAt ? new Date(d.audit.completedAt).toLocaleDateString() : "Never"}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!siteAId || !siteBId) && (
        <div style={{
          background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-xl)", padding: "48px", textAlign: "center",
        }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>⇔</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "6px" }}>Select two sites above</div>
          <div style={{ fontSize: "12px", color: "var(--foreground-3)" }}>Choose sites A and B to see a side-by-side SEO comparison.</div>
        </div>
      )}
    </div>
  )
}
