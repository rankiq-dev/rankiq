export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getSiteById } from "@/db/repositories/sites"
import { getAuditsForSite, getIssuesByAudit } from "@/db/repositories/audits"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Audit Comparison" }

export default async function AuditComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const { a: auditAId, b: auditBId } = await searchParams

  const site = await getSiteById(id, session.user.id)
  if (!site) notFound()

  const audits = await getAuditsForSite(id)
  const complete = audits.filter(a => a.status === "complete")

  // If no query params, show selector UI
  if (!auditAId || !auditBId || complete.length < 2) {
    return (
      <div style={{ padding: "32px 40px", maxWidth: "800px" }}>
        <div style={{ marginBottom: "28px" }}>
          <Link href={`/sites/${id}`} style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", marginBottom: "12px", display: "inline-block" }}>
            ← Back to {site.domain}
          </Link>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.5px", marginBottom: "6px" }}>Compare Audits</h1>
          <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>Select two audits to compare side-by-side</p>
        </div>

        {complete.length < 2 ? (
          <div style={{
            padding: "40px", textAlign: "center",
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>◎</div>
            <div style={{ fontSize: "14px", color: "var(--foreground-2)" }}>Need at least 2 completed audits to compare</div>
          </div>
        ) : (
          <CompareSelector siteId={id} audits={complete.map(a => ({ id: a.id, createdAt: a.createdAt, healthScore: a.healthScore }))} />
        )}
      </div>
    )
  }

  const [auditA, auditB] = await Promise.all([
    getAuditsForSite(id).then(all => all.find(a => a.id === auditAId)),
    getAuditsForSite(id).then(all => all.find(a => a.id === auditBId)),
  ])

  if (!auditA || !auditB) notFound()

  const [issuesA, issuesB] = await Promise.all([
    getIssuesByAudit(auditAId),
    getIssuesByAudit(auditBId),
  ])

  const scoreDiff = (auditB.healthScore ?? 0) - (auditA.healthScore ?? 0)
  const issuesDiff = issuesB.length - issuesA.length

  const labelA = new Date(auditA.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const labelB = new Date(auditB.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  // Content quality comparison from pageAnalyses
  type PageAnalysis = { wordCount?: number; isNoindex?: boolean; hasJsonLd?: boolean; h1Text?: string; imagesMissingAlt?: number; imageCount?: number; hasCanonical?: boolean; onPageScore?: number; internalLinkCount?: number }
  const pagesA = (auditA.pageAnalyses ? (auditA.pageAnalyses as PageAnalysis[]) : []).filter(p => !p.isNoindex)
  const pagesB = (auditB.pageAnalyses ? (auditB.pageAnalyses as PageAnalysis[]) : []).filter(p => !p.isNoindex)
  const avgWordA = pagesA.length > 0 ? Math.round(pagesA.reduce((s, p) => s + (p.wordCount ?? 0), 0) / pagesA.length) : null
  const avgWordB = pagesB.length > 0 ? Math.round(pagesB.reduce((s, p) => s + (p.wordCount ?? 0), 0) / pagesB.length) : null
  const schemaA = pagesA.filter(p => p.hasJsonLd).length
  const schemaB = pagesB.filter(p => p.hasJsonLd).length
  const noH1A = pagesA.filter(p => !p.h1Text).length
  const noH1B = pagesB.filter(p => !p.h1Text).length
  const canonA = pagesA.length > 0 ? Math.round(pagesA.filter(p => p.hasCanonical).length / pagesA.length * 100) : null
  const canonB = pagesB.length > 0 ? Math.round(pagesB.filter(p => p.hasCanonical).length / pagesB.length * 100) : null
  const avgScoreA = pagesA.length > 0 ? Math.round(pagesA.reduce((s, p) => s + (p.onPageScore ?? 0), 0) / pagesA.length) : null
  const avgScoreB = pagesB.length > 0 ? Math.round(pagesB.reduce((s, p) => s + (p.onPageScore ?? 0), 0) / pagesB.length) : null
  const avgLinksA = pagesA.length > 0 ? parseFloat((pagesA.reduce((s, p) => s + (p.internalLinkCount ?? 0), 0) / pagesA.length).toFixed(1)) : null
  const avgLinksB = pagesB.length > 0 ? parseFloat((pagesB.reduce((s, p) => s + (p.internalLinkCount ?? 0), 0) / pagesB.length).toFixed(1)) : null

  // Count issues by type in both audits
  const ruleCountA = new Map<string, number>()
  for (const i of issuesA) ruleCountA.set(i.type, (ruleCountA.get(i.type) ?? 0) + 1)
  const ruleCountB = new Map<string, number>()
  for (const i of issuesB) ruleCountB.set(i.type, (ruleCountB.get(i.type) ?? 0) + 1)

  const allRules = [...new Set([...ruleCountA.keys(), ...ruleCountB.keys()])].sort()

  // New vs resolved issues
  const newIssueTypes = [...ruleCountB.entries()].filter(([type]) => !ruleCountA.has(type)).map(([t]) => t)
  const resolvedIssueTypes = [...ruleCountA.entries()].filter(([type]) => !ruleCountB.has(type)).map(([t]) => t)
  const worsenedTypes = allRules.filter(t => (ruleCountB.get(t) ?? 0) > (ruleCountA.get(t) ?? 0))
  const improvedTypes = allRules.filter(t => (ruleCountB.get(t) ?? 0) < (ruleCountA.get(t) ?? 0))

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1000px" }}>
      <div style={{ marginBottom: "28px" }}>
        <Link href={`/sites/${id}`} style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", marginBottom: "12px", display: "inline-block" }}>
          ← Back to {site.domain}
        </Link>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.5px", marginBottom: "6px" }}>Audit Comparison</h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)" }}>{site.domain} · {labelA} vs {labelB}</p>
      </div>

      {/* Score comparison */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "28px", marginBottom: "16px",
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "20px",
      }}>
        <ScoreBlock label={labelA} score={auditA.healthScore ?? 0} auditId={auditAId} />
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "24px", fontWeight: 900,
            color: scoreDiff > 0 ? "var(--success)" : scoreDiff < 0 ? "var(--destructive)" : "var(--foreground-3)",
            fontFamily: "var(--font-mono)",
          }}>
            {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
          </div>
          <div style={{ fontSize: "10px", color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>
            Score change
          </div>
          {scoreDiff !== 0 && (
            <div style={{ marginTop: "8px", width: "80px", height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden", position: "relative" }}>
              {scoreDiff > 0
                ? <div style={{ position: "absolute", left: "50%", width: `${Math.min(50, Math.abs(scoreDiff) * 2)}%`, height: "100%", background: "var(--success)", borderRadius: "2px" }} />
                : <div style={{ position: "absolute", right: "50%", width: `${Math.min(50, Math.abs(scoreDiff) * 2)}%`, height: "100%", background: "var(--destructive)", borderRadius: "2px", left: "auto" }} />
              }
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "var(--foreground-3)" }} />
            </div>
          )}
        </div>
        <ScoreBlock label={labelB} score={auditB.healthScore ?? 0} auditId={auditBId} isNewer />
      </div>

      {/* Issues count comparison */}
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
        padding: "20px 28px", marginBottom: "16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Total Issues</div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--foreground)" }}>{issuesA.length}</span>
            <span style={{ fontSize: "12px", color: "var(--foreground-3)" }}>→</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--foreground)" }}>{issuesB.length}</span>
          </div>
        </div>
        <div style={{
          padding: "6px 14px", borderRadius: "20px",
          background: issuesDiff < 0 ? "var(--success-bg)" : issuesDiff > 0 ? "var(--destructive-bg)" : "oklch(0.18 0.006 230)",
          color: issuesDiff < 0 ? "var(--success)" : issuesDiff > 0 ? "var(--destructive)" : "var(--foreground-3)",
          fontSize: "12px", fontWeight: 700,
        }}>
          {issuesDiff > 0 ? `+${issuesDiff} more issues` : issuesDiff < 0 ? `${Math.abs(issuesDiff)} issues fixed` : "No change"}
        </div>
      </div>

      {/* Pages count comparison */}
      {(auditA.pagesCount != null || auditB.pagesCount != null) && (() => {
        const pA = auditA.pagesCount ?? 0
        const pB = auditB.pagesCount ?? 0
        const pDiff = pB - pA
        return (
          <div style={{
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            padding: "20px 28px", marginBottom: "16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Pages Crawled</div>
              <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--foreground)" }}>{pA}</span>
                <span style={{ fontSize: "12px", color: "var(--foreground-3)" }}>→</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--foreground)" }}>{pB}</span>
              </div>
            </div>
            <div style={{
              padding: "6px 14px", borderRadius: "20px",
              background: pDiff > 0 ? "var(--success-bg)" : pDiff < 0 ? "var(--destructive-bg)" : "oklch(0.18 0.006 230)",
              color: pDiff > 0 ? "var(--success)" : pDiff < 0 ? "var(--destructive)" : "var(--foreground-3)",
              fontSize: "12px", fontWeight: 700,
            }}>
              {pDiff === 0 ? "No change" : pDiff > 0 ? `+${pDiff} pages` : `${pDiff} pages`}
            </div>
          </div>
        )
      })()}

      {/* New vs resolved issue types */}
      {(newIssueTypes.length > 0 || resolvedIssueTypes.length > 0) && (
        <div style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "20px 28px", marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {resolvedIssueTypes.length > 0 && (
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>✓ {resolvedIssueTypes.length} issue type{resolvedIssueTypes.length > 1 ? "s" : ""} resolved</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {resolvedIssueTypes.slice(0, 4).map(t => (
                  <div key={t} style={{ fontSize: "11px", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{t.replace(/_/g, " ")}</div>
                ))}
                {resolvedIssueTypes.length > 4 && <div style={{ fontSize: "10px", color: "var(--foreground-3)" }}>+{resolvedIssueTypes.length - 4} more</div>}
              </div>
            </div>
          )}
          {newIssueTypes.length > 0 && (
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>⚠ {newIssueTypes.length} new issue type{newIssueTypes.length > 1 ? "s" : ""} found</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {newIssueTypes.slice(0, 4).map(t => (
                  <div key={t} style={{ fontSize: "11px", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{t.replace(/_/g, " ")}</div>
                ))}
                {newIssueTypes.length > 4 && <div style={{ fontSize: "10px", color: "var(--foreground-3)" }}>+{newIssueTypes.length - 4} more</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content quality comparison */}
      {(avgWordA != null || avgWordB != null) && (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "20px 28px", marginBottom: "16px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Content Quality</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
            {[
              { label: "Avg word count", a: avgWordA, b: avgWordB, betterIfHigher: true, fmt: (v: number) => v.toLocaleString() },
              { label: "Pages with schema", a: schemaA, b: schemaB, betterIfHigher: true, fmt: (v: number) => `${v}` },
              { label: "Pages missing H1", a: noH1A, b: noH1B, betterIfHigher: false, fmt: (v: number) => `${v}` },
              { label: "Canonical coverage", a: canonA, b: canonB, betterIfHigher: true, fmt: (v: number) => `${v}%` },
              { label: "Avg on-page score", a: avgScoreA, b: avgScoreB, betterIfHigher: true, fmt: (v: number) => `${v}` },
              { label: "Avg internal links", a: avgLinksA, b: avgLinksB, betterIfHigher: true, fmt: (v: number) => `${v}` },
            ].map(({ label, a, b, betterIfHigher, fmt }) => {
              if (a == null || b == null) return null
              const diff = b - a
              const improved = betterIfHigher ? diff > 0 : diff < 0
              const color = diff === 0 ? "var(--foreground-3)" : improved ? "var(--success)" : "var(--destructive)"
              return (
                <div key={label}>
                  <div style={{ fontSize: "10px", color: "var(--foreground-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 700, color: "var(--foreground-3)" }}>{fmt(a)}</span>
                    <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>→</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}>{fmt(b)}</span>
                    {diff !== 0 && <span style={{ fontSize: "11px", fontWeight: 700, color }}>{diff > 0 ? "+" : ""}{diff}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-rule breakdown */}
      {allRules.length > 0 && (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--glass-border)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Issue Breakdown by Rule</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                {["Rule", labelA, labelB, "Change"].map(h => (
                  <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRules.map(rule => {
                const cA = ruleCountA.get(rule) ?? 0
                const cB = ruleCountB.get(rule) ?? 0
                const diff = cB - cA
                return (
                  <tr key={rule} style={{ borderBottom: "1px solid oklch(0.98 0 0 / 0.04)" }}>
                    <td style={{ padding: "10px 24px", fontSize: "12px", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>{rule}</td>
                    <td style={{ padding: "10px 24px", fontSize: "12px", color: "var(--foreground)", textAlign: "right" }}>{cA}</td>
                    <td style={{ padding: "10px 24px", fontSize: "12px", color: "var(--foreground)", textAlign: "right" }}>{cB}</td>
                    <td style={{ padding: "10px 24px", fontSize: "12px", textAlign: "right" }}>
                      <span style={{
                        color: diff < 0 ? "var(--success)" : diff > 0 ? "var(--destructive)" : "var(--foreground-3)",
                        fontWeight: diff !== 0 ? 700 : 400,
                      }}>
                        {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "—"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ScoreBlock({ label, score, auditId, isNewer }: { label: string; score: number; auditId: string; isNewer?: boolean }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--destructive)"
  return (
    <div style={{ textAlign: isNewer ? "right" : "left" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{isNewer ? "Newer" : "Older"} · {label}</div>
      <div style={{ fontSize: "48px", fontWeight: 900, color, fontFamily: "var(--font-mono)", letterSpacing: "-2px" }}>{score}</div>
      <Link href={`/audits/${auditId}`} style={{ fontSize: "11px", color: "var(--primary)", textDecoration: "none" }}>View audit →</Link>
    </div>
  )
}

function CompareSelector({ siteId, audits }: { siteId: string; audits: { id: string; createdAt: Date | null; healthScore: number | null }[] }) {
  const rows = audits.slice(0, 6)
  const first = rows[0]?.id ?? ""
  const second = rows[1]?.id ?? ""
  return (
    <div style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", padding: "28px" }}>
      <p style={{ fontSize: "13px", color: "var(--foreground-2)", marginBottom: "16px" }}>
        Choose two completed audits, then click Compare.
      </p>
      <form action={`/sites/${siteId}/compare`} method="get">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {["a", "b"].map((name, i) => (
            <div key={name}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                {i === 0 ? "Older audit" : "Newer audit"}
              </label>
              <select name={name} defaultValue={i === 0 ? second : first} style={{
                width: "100%", padding: "8px 12px", fontSize: "13px",
                background: "oklch(0.14 0.006 230)", color: "var(--foreground)",
                border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                fontFamily: "var(--font-sans), sans-serif",
              }}>
                {rows.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : a.id.slice(0,8)} · Score {a.healthScore ?? "—"}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button type="submit" style={{
          padding: "10px 24px", fontSize: "13px", fontWeight: 700,
          background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
          color: "var(--primary-foreground)", border: "none", borderRadius: "var(--radius-md)",
          cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
          boxShadow: "var(--shadow-glow)",
        }}>Compare →</button>
      </form>
    </div>
  )
}
