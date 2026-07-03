export const dynamic = "force-dynamic"
import Link from "next/link"
import type { Metadata } from "next"
import { getAllSitesForAdmin } from "@/db/repositories/admin"

export const metadata: Metadata = { title: "Admin · Sites" }

const STATUS_COLORS: Record<string, string> = {
  complete: "oklch(0.70 0.15 145)",
  running: "oklch(0.70 0.15 220)",
  queued: "oklch(0.75 0.14 75)",
  failed: "oklch(0.65 0.20 27)",
}

export default async function AdminSitesPage() {
  const sites = await getAllSitesForAdmin()

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1240px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>Sites</h1>
        <p style={{ fontSize: "13px", color: "oklch(0.55 0.008 25)", marginTop: "4px" }}>
          {sites.length} sites across the platform
        </p>
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
                <Th align="right">Audits</Th>
                <Th align="right">Latest Score</Th>
                <Th>Last Status</Th>
                <Th>Added</Th>
              </tr>
            </thead>
            <tbody>
              {sites.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid oklch(0.30 0.05 25 / 0.15)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600 }}>{s.displayName ?? s.domain}</div>
                    <div style={{ fontSize: "11px", color: "oklch(0.55 0.008 25)" }}>{s.domain}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/admin/users/${s.ownerId}`} style={{ color: "oklch(0.70 0.20 27)", textDecoration: "none", fontSize: "11px" }}>
                      {s.ownerName ?? s.ownerEmail}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    {s.auditCount}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    {s.latestHealthScore != null ? `${s.latestHealthScore}/100` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {s.latestAuditStatus ? (
                      <span style={{
                        fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px",
                        borderRadius: "4px", background: "oklch(0.16 0.010 25)",
                        color: STATUS_COLORS[s.latestAuditStatus] ?? "oklch(0.55 0.008 25)",
                      }}>
                        {s.latestAuditStatus}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "oklch(0.55 0.008 25)" }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "oklch(0.45 0.008 25)" }}>
                    No sites yet.
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
