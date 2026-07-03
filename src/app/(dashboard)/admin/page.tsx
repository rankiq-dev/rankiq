export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { isAdminEmail } from "@/lib/admin"
import { getAllUsersForAdmin, getPlatformStats } from "@/db/repositories/admin"
import { AdminUsersTable } from "./AdminUsersTable"

export const metadata: Metadata = { title: "Admin" }

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!isAdminEmail(session.user.email)) redirect("/dashboard")

  const [users, stats] = await Promise.all([
    getAllUsersForAdmin(),
    getPlatformStats(),
  ])

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1200px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{
            padding: "3px 10px", borderRadius: "20px",
            background: "oklch(0.25 0.12 27 / 0.25)", border: "1px solid oklch(0.65 0.20 27 / 0.35)",
            fontSize: "9px", fontWeight: 700, color: "oklch(0.75 0.18 27)",
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>Admin</span>
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px" }}>
          Platform Control
        </h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", marginTop: "4px" }}>
          Manage users, plans, and view platform-wide usage — {session.user.email}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "28px" }}>
        <StatCard label="Total Users" value={stats.totalUsers} color="var(--primary)" />
        <StatCard label="Starter" value={stats.usersByPlan.starter ?? 0} color="var(--foreground-3)" />
        <StatCard label="Growth" value={stats.usersByPlan.growth ?? 0} color="var(--info)" />
        <StatCard label="Agency" value={stats.usersByPlan.agency ?? 0} color="var(--success)" />
        <StatCard label="Total Sites" value={stats.totalSites} color="var(--primary-2)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
        <StatCard label="Total Audits" value={stats.totalAudits} color="var(--warning)" />
        <StatCard label="Audits (7d)" value={stats.auditsLast7d} color="var(--success)" />
        <StatCard label="Audits (30d)" value={stats.auditsLast30d} color="var(--info)" />
      </div>

      <AdminUsersTable initialUsers={users} />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      padding: "16px 18px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}
