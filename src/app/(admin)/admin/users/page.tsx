export const dynamic = "force-dynamic"
import type { Metadata } from "next"
import { getAllUsersForAdmin } from "@/db/repositories/admin"
import { AdminUsersTable } from "./AdminUsersTable"

export const metadata: Metadata = { title: "Admin · Users" }

export default async function AdminUsersPage() {
  const users = await getAllUsersForAdmin()

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1240px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>Users</h1>
        <p style={{ fontSize: "13px", color: "oklch(0.55 0.008 25)", marginTop: "4px" }}>
          {users.length} total — manage plans, view usage, drill into any account
        </p>
      </div>
      <AdminUsersTable initialUsers={users} />
    </div>
  )
}
