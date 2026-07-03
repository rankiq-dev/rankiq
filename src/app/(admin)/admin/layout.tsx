export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { isAdminEmail } from "@/lib/admin"
import { AdminNavItem } from "./AdminNavItem"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!isAdminEmail(session.user.email)) redirect("/dashboard")

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "oklch(0.06 0.006 25)",
      fontFamily: "var(--font-sans), sans-serif",
      color: "oklch(0.92 0.008 25)",
    }}>
      {/* Sidebar */}
      <aside style={{
        width: "230px", flexShrink: 0,
        borderRight: "1px solid oklch(0.30 0.05 25 / 0.3)",
        display: "flex", flexDirection: "column",
        background: "oklch(0.08 0.010 25 / 0.95)",
        position: "sticky", top: 0, height: "100vh",
      }}>
        {/* Logo / brand */}
        <div style={{ padding: "20px 20px 18px", borderBottom: "1px solid oklch(0.30 0.05 25 / 0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "8px",
              background: "linear-gradient(135deg, oklch(0.55 0.20 27), oklch(0.45 0.20 15))",
              boxShadow: "0 0 16px oklch(0.55 0.20 27 / 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1.5L13 4v4c0 3.5-2.3 5.9-5.5 6.5C4.3 13.9 2 11.5 2 8V4l5.5-2.5Z" fill="white" fillOpacity="0.92"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "-0.3px", color: "oklch(0.95 0.005 25)" }}>
                Admin Console
              </div>
              <div style={{ fontSize: "9px", color: "oklch(0.55 0.15 27)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                RankIQ Internal
              </div>
            </div>
          </div>
          <Link href="/dashboard" style={{
            fontSize: "11px", color: "oklch(0.55 0.008 25)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: "4px",
          }}>
            ← Back to app
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <AdminNavItem href="/admin" label="Overview" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.8"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.8"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.8"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.4"/></svg>
          } exact />
          <AdminNavItem href="/admin/users" label="Users" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" opacity="0.8"/><path d="M2.5 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/></svg>
          } />
          <AdminNavItem href="/admin/sites" label="Sites" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.2" stroke="currentColor" strokeWidth="1.2" opacity="0.8"/><path d="M1.3 7.5h12.4M7.5 1.3c2 2 2 9.4 0 12.4M7.5 1.3c-2 2-2 9.4 0 12.4" stroke="currentColor" strokeWidth="1" opacity="0.6"/></svg>
          } />
          <AdminNavItem href="/admin/audits" label="Audits" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="3" width="11" height="2" rx="1" fill="currentColor" opacity="0.8"/><rect x="2" y="6.5" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.5"/><rect x="2" y="10" width="9.5" height="1.5" rx="0.75" fill="currentColor" opacity="0.5"/></svg>
          } />
          <AdminNavItem href="/admin/billing" label="Billing" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" opacity="0.8"/><path d="M1.5 6.5h12" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/></svg>
          } />
        </nav>

        {/* Admin identity */}
        <div style={{
          padding: "14px 16px", borderTop: "1px solid oklch(0.30 0.05 25 / 0.3)",
          fontSize: "11px", color: "oklch(0.55 0.008 25)",
        }}>
          Signed in as
          <div style={{ color: "oklch(0.85 0.008 25)", fontWeight: 600, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {session.user.email}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </div>
  )
}
