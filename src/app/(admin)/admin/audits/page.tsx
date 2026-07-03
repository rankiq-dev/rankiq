export const dynamic = "force-dynamic"
import Link from "next/link"
import type { Metadata } from "next"
import { getRecentAuditsForAdmin, getStuckAudits } from "@/db/repositories/admin"

export const metadata: Metadata = { title: "Admin · Audits" }

const STATUS_COLORS: Record<string, string> = {
  complete: "oklch(0.70 0.15 145)",
  running: "oklch(0.70 0.15 220)",
  queued: "oklch(0.75 0.14 75)",
  failed: "oklch(0.65 0.20 27)",
}

export default async function AdminAuditsPage({
  searchParams,
}: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams
  const isStuckFilter = filter === "stuck"

  const audits = isStuckFilter
    ? await getStuckAudits(15)
    : await getRecentAuditsForAdmin(150)

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1240px" }}>
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>Audits</h1>
          <p style={{ fontSize: "13px", color: "oklch(0.55 0.008 25)", marginTop: "4px" }}>
            {isStuckFilter ? `${audits.length} stuck (queued/running 15+ min)` : `Last ${audits.length} audits, newest first`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <Link href="/admin/audits" style={{
            padding: "6px 14px", fontSize: "12px", fontWeight: 700, borderRadius: "8px", textDecoration: "none",
            background: !isStuckFilter ? "oklch(0.55 0.20 27 / 0.2)" : "oklch(0.14 0.010 25)",
            color: !isStuckFilter ? "oklch(0.75 0.20 27)" : "oklch(0.65 0.008 25)",
            border: !isStuckFilter ? "1px solid oklch(0.55 0.20 27 / 0.4)" : "1px solid oklch(0.30 0.05 25 / 0.4)",
          }}>Recent</Link>
          <Link href="/admin/audits?filter=stuck" style={{
            padding: "6px 14px", fontSize: "12px", fontWeight: 700, borderRadius: "8px", textDecoration: "none",
            background: isStuckFilter ? "oklch(0.55 0.20 27 / 0.2)" : "oklch(0.14 0.010 25)",
            color: isStuckFilter ? "oklch(0.75 0.20 27)" : "oklch(0.65 0.008 25)",
            border: isStuckFilter ? "1px solid oklch(0.55 0.20 27 / 0.4)" : "1px solid oklch(0.30 0.05 25 / 0.4)",
          }}>⚠ Stuck</Link>
        </div>
      </div>

      <div style={{
        background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.30 0.05 25 / 0.3)" }}>
                <Th>Domain</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th align="right">Score</Th>
                <Th align="right">Pages</Th>
                <Th>Error</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {audits.map(a => (
                <tr key={a.id} style={{ borderBottom: "1px solid oklch(0.30 0.05 25 / 0.15)" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 600 }}>{a.domain}</td>
                  <td style={{ padding: "11px 16px", color: "oklch(0.55 0.008 25)", fontSize: "11px" }}>{a.ownerEmail}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px",
                      borderRadius: "4px", background: "oklch(0.16 0.010 25)",
                      color: STATUS_COLORS[a.status] ?? "oklch(0.55 0.008 25)",
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    {a.healthScore ?? "—"}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    {a.pagesCount ?? "—"}
                  </td>
                  <td style={{ padding: "11px 16px", color: "oklch(0.65 0.15 27)", fontSize: "11px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.errorMessage ?? "—"}
                  </td>
                  <td style={{ padding: "11px 16px", color: "oklch(0.55 0.008 25)" }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "oklch(0.45 0.008 25)" }}>
                    {isStuckFilter ? "No stuck audits — worker is healthy." : "No audits yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{
      padding: "10px 16px", textAlign: align ?? "left",
      fontSize: "9px", fontWeight: 700, color: "oklch(0.50 0.008 25)",
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>
      {children}
    </th>
  )
}
