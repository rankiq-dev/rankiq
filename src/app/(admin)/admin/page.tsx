export const dynamic = "force-dynamic"
import Link from "next/link"
import type { Metadata } from "next"
import { getPlatformStats, getAllUsersForAdmin, getStuckAudits } from "@/db/repositories/admin"
import { StatCard } from "./StatCard"

export const metadata: Metadata = { title: "Admin · Overview" }

export default async function AdminOverviewPage() {
  const [stats, users, stuckAudits] = await Promise.all([
    getPlatformStats(),
    getAllUsersForAdmin(),
    getStuckAudits(15),
  ])

  const recentUsers = users.slice(0, 8)

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1240px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>Overview</h1>
        <p style={{ fontSize: "13px", color: "oklch(0.55 0.008 25)", marginTop: "4px" }}>
          Platform-wide health at a glance
        </p>
      </div>

      {stuckAudits.length > 0 && (
        <div style={{
          background: "oklch(0.20 0.10 60 / 0.15)", border: "1px solid oklch(0.65 0.15 60 / 0.35)",
          borderRadius: "12px", padding: "14px 18px", marginBottom: "24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>⚠</span>
            <span style={{ fontSize: "13px", color: "oklch(0.85 0.10 60)" }}>
              <strong>{stuckAudits.length}</strong> audit{stuckAudits.length !== 1 ? "s" : ""} stuck queued/running for 15+ min — worker may be down.
            </span>
          </div>
          <Link href="/admin/audits?filter=stuck" style={{ fontSize: "12px", color: "oklch(0.85 0.10 60)", fontWeight: 700, textDecoration: "none" }}>
            View →
          </Link>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "14px" }}>
        <StatCard label="Total Users" value={stats.totalUsers} color="oklch(0.65 0.20 27)" sub={`+${stats.newUsersLast7d} in 7d`} />
        <StatCard label="Total Sites" value={stats.totalSites} color="oklch(0.65 0.15 200)" />
        <StatCard label="Total Audits" value={stats.totalAudits} color="oklch(0.70 0.15 145)" sub={`+${stats.auditsLast7d} in 7d`} />
        <StatCard label="Failed Audits (7d)" value={stats.failedAuditsLast7d} color="oklch(0.65 0.20 27)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
        <StatCard label="Starter Users" value={stats.usersByPlan.starter ?? 0} color="oklch(0.55 0.008 25)" />
        <StatCard label="Growth Users" value={stats.usersByPlan.growth ?? 0} color="oklch(0.65 0.15 220)" />
        <StatCard label="Agency Users" value={stats.usersByPlan.agency ?? 0} color="oklch(0.70 0.15 145)" />
      </div>

      <div style={{
        background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid oklch(0.30 0.05 25 / 0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "13px", fontWeight: 700 }}>Recent Signups</div>
          <Link href="/admin/users" style={{ fontSize: "11px", color: "oklch(0.65 0.20 27)", textDecoration: "none", fontWeight: 700 }}>
            View all users →
          </Link>
        </div>
        <div>
          {recentUsers.map(u => (
            <Link key={u.id} href={`/admin/users/${u.id}`} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 20px", borderBottom: "1px solid oklch(0.30 0.05 25 / 0.15)",
              textDecoration: "none", color: "inherit",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: "oklch(0.55 0.20 27 / 0.15)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 700, color: "oklch(0.70 0.20 27)",
                }}>
                  {(u.name ?? u.email)[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{u.name ?? u.email}</div>
                  <div style={{ fontSize: "11px", color: "oklch(0.55 0.008 25)" }}>{u.email}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{
                  fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px",
                  borderRadius: "4px", background: "oklch(0.20 0.02 25)", color: "oklch(0.65 0.008 25)",
                }}>{u.plan}</span>
                <span style={{ fontSize: "11px", color: "oklch(0.45 0.008 25)" }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
          {recentUsers.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "oklch(0.45 0.008 25)", fontSize: "13px" }}>
              No users yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
