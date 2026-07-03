"use client"
import { useState } from "react"
import { useOptionalToast } from "@/components/ui/Toast"
import type { AdminUserRow } from "@/db/repositories/admin"

const PLAN_COLORS: Record<string, string> = {
  starter: "var(--foreground-3)",
  growth: "var(--info)",
  agency: "var(--success)",
}

export function AdminUsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const { toast } = useOptionalToast()

  const filtered = search.trim()
    ? users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : users

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
      background: "var(--glass-bg)", backdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
          All Users <span style={{ color: "var(--foreground-3)", fontWeight: 500 }}>({filtered.length})</span>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          style={{
            padding: "6px 12px", fontSize: "12px", width: "260px",
            background: "oklch(0.17 0.006 230)", border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)", color: "var(--foreground)", outline: "none",
          }}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
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
              <tr key={u.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" width={24} height={24} style={{ borderRadius: "50%", flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                        background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, color: "var(--primary-2)",
                      }}>
                        {(u.name ?? u.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ color: "var(--foreground)", fontWeight: 600 }}>{u.name ?? "—"}</div>
                      <div style={{ color: "var(--foreground-3)", fontSize: "11px" }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    color: PLAN_COLORS[u.plan] ?? "var(--foreground-3)",
                    background: "oklch(0.18 0.006 230)",
                    border: `1px solid ${PLAN_COLORS[u.plan] ?? "var(--glass-border)"}40`,
                  }}>
                    {u.plan}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--foreground-3)" }}>
                  {u.subscriptionStatus ?? "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>
                  {u.siteCount}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--foreground-2)", fontFamily: "var(--font-mono)" }}>
                  {u.auditCount}
                </td>
                <td style={{ padding: "12px 16px", color: "var(--foreground-3)" }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <select
                    value={u.plan}
                    disabled={savingId === u.id}
                    onChange={e => changePlan(u.id, e.target.value)}
                    style={{
                      padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                      background: "oklch(0.17 0.006 230)", border: "1px solid var(--glass-border)",
                      borderRadius: "var(--radius-md)", color: "var(--foreground)",
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
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--foreground-3)" }}>
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
      fontSize: "9px", fontWeight: 700, color: "var(--foreground-3)",
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>
      {children}
    </th>
  )
}
