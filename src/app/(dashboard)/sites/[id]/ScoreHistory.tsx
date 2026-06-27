import { getAuditsForSite } from "@/db/repositories/audits"
import Link from "next/link"

export async function ScoreHistory({ siteId }: { siteId: string }) {
  const audits = await getAuditsForSite(siteId, 12)
  const completed = audits.filter(a => a.status === "complete" && a.healthScore != null)

  if (completed.length < 2) return null

  // Build SVG sparkline
  const scores = completed.map(a => a.healthScore!)
  const dates = completed.map(a => a.completedAt ?? a.createdAt)
  const minS = Math.min(...scores)
  const maxS = Math.max(...scores)
  const range = maxS - minS || 1
  const W = 280
  const H = 60
  const pad = 8

  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (s - minS) / range) * (H - pad * 2)
    return { x, y, s, date: dates[i], id: completed[i].id }
  })

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${(H - pad).toFixed(1)} L${points[0].x.toFixed(1)},${(H - pad).toFixed(1)} Z`

  const latest = scores[0]
  const prev = scores[1]
  const delta = latest - prev
  const deltaColor = delta > 0 ? "var(--success)" : delta < 0 ? "var(--destructive)" : "var(--foreground-3)"

  return (
    <div style={{
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)", padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
            Score History
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)", letterSpacing: "-1px" }}>{latest}</span>
            {delta !== 0 && (
              <span style={{ fontSize: "12px", fontWeight: 700, color: deltaColor }}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
            )}
          </div>
        </div>
        <Link href={`/audits/page?siteId=${siteId}`} style={{ fontSize: "11px", color: "var(--primary-2)", textDecoration: "none", marginTop: "4px" }}>
          All audits →
        </Link>
      </div>

      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-${siteId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.13 196)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="oklch(0.65 0.13 196)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${siteId})`}/>
        <path d={pathD} fill="none" stroke="oklch(0.65 0.13 196)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 4 : 2.5}
            fill={i === 0 ? "oklch(0.65 0.13 196)" : "oklch(0.14 0.006 230)"}
            stroke="oklch(0.65 0.13 196)" strokeWidth="1.5"/>
        ))}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
        <span style={{ fontSize: "9px", color: "var(--foreground-3)" }}>
          {dates[dates.length - 1] ? new Date(dates[dates.length - 1]!).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
        </span>
        <span style={{ fontSize: "9px", color: "var(--foreground-3)" }}>
          {dates[0] ? new Date(dates[0]!).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
        </span>
      </div>
    </div>
  )
}
