"use client"
import { useState } from "react"
import Link from "next/link"
import { useOptionalToast } from "@/components/ui/Toast"
import type { AdminUserRow } from "@/db/repositories/admin"

const PLAN_COLORS: Record<string, string> = {
  starter: "oklch(0.55 0.008 25)",
  growth: "oklch(0.65 0.15 220)",
  agency: "oklch(0.70 0.15 145)",
}

export function AdminUsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [savingId, setSavingId] = useState<string | null>(null)
  const { toast } = useOptionalToast()

  const filtered = users.filter(u => {
    const matchesSearch = !search.trim() ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesPlan = planFilter === "all" || u.plan === planFilter
    return matchesSearch && matchesPlan
  })

  async function changePlan(userId: string, plan: string) {
    setSavingId(userId)
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: plan as AdminUserRow["plan"] } : u))
        toast(`Plan updated to ${plan}`, "success")
      } else {
        const err = await res.json().catch(() => null) as { error?: { message?: string } } | null
        toast(err?.error?.message ?? "Failed to update plan", "error")
      }
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={{
      background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
      borderRadius: "14px", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid oklch(0.30 0.05 25 / 0.3)", display: "flex", alignItems: "center", gap: "12px" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          style={{
            flex: 1, padding: "7px 12px", fontSize: "12px",
            background: "oklch(0.14 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.4)",
            borderRadius: "8px", color: "oklch(0.90 0.008 25)", outline: "none",
          }}
        />
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          style={{
            padding: "7px 12px", fontSize: "12px", fontWeight: 600,
            background: "oklch(0.14 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.4)",
            borderRadius: "8px", color: "oklch(0.90 0.008 25)", cursor: "pointer",
          }}
        >
          <option value="all">All plans</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="agency">Agency</option>
        </select>
        <span style={{ fontSize: "11px", color: "oklch(0.50 0.008 25)", whiteSpace: "nowrap" }}>
          {filtered.length} of {users.length}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid oklch(0.30 0.05 25 / 0.3)" }}>
              <Th>User</Th>
              <Th>Plan</Th>
              <Th>Status</Th>
              <Th align="right">Sites</Th>
              <Th align="right">Audits</Th>
              <Th>Joined</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid oklch(0.30 0.05 25 / 0.15)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <Link href={`/admin/users/${u.id}`} style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "inherit" }}>
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" width={24} height={24} style={{ borderRadius: "50%", flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                        background: "oklch(0.55 0.20 27 / 0.15)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, color: "oklch(0.70 0.20 27)",
                      }}>
                        {(u.name ?? u.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name ?? "—"}</div>
                      <div style={{ color: "oklch(0.55 0.008 25)", fontSize: "11px" }}>{u.email}</div>
                    </div>
                  </Link>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    color: PLAN_COLORS[u.plan] ?? "oklch(0.55 0.008 25)",
                    background: "oklch(0.16 0.010 25)",
                  }}>
                    {u.plan}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "oklch(0.55 0.008 25)" }}>
                  {u.subscriptionStatus ?? "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {u.siteCount}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {u.auditCount}
                </td>
                <td style={{ padding: "12px 16px", color: "oklch(0.55 0.008 25)" }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <select
                    value={u.plan}
                    disabled={savingId === u.id}
                    onChange={e => changePlan(u.id, e.target.value)}
                    style={{
                      padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                      background: "oklch(0.14 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.4)",
                      borderRadius: "6px", color: "oklch(0.90 0.008 25)",
                      cursor: savingId === u.id ? "default" : "pointer",
                      opacity: savingId === u.id ? 0.6 : 1,
                    }}
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="agency">Agency</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "oklch(0.45 0.008 25)" }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
