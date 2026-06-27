export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ParticleField } from "@/components/ui/ParticleField"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const user = session.user

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)", fontFamily: "var(--font-sans), sans-serif", color: "var(--foreground)", position: "relative" }}>
      <ParticleField />

      {/* Sidebar */}
      <aside style={{
        width: "220px", flexShrink: 0,
        borderRight: "1px solid var(--glass-border)",
        display: "flex", flexDirection: "column",
        background: "oklch(0.10 0.008 230 / 0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, height: "100vh",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 20px", borderBottom: "1px solid var(--glass-border)" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
              boxShadow: "0 0 16px var(--primary-glow)",
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 8L8 14L2 8L8 2Z" fill="oklch(0.98 0.005 230)" fillOpacity="0.9"/>
                <path d="M8 5L11 8L8 11L5 8L8 5Z" fill="oklch(0.10 0.008 230)"/>
              </svg>
            </div>
            <span style={{
              fontSize: "17px", fontWeight: 800,
              background: "linear-gradient(135deg, oklch(0.85 0.13 178), oklch(0.90 0.13 196))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}>RankIQ</span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <NavItem href="/dashboard" label="Dashboard" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.8"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.8"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.8"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.4"/></svg>
          } />
          <NavItem href="/sites/new" label="Add Site" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" opacity="0.8"/><path d="M7.5 4.5V10.5M4.5 7.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          } />
          <NavItem href="/agency" label="Agency View" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 11L7.5 4L13 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/><path d="M5 11L7.5 7.5L10 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          } />
          <NavItem href="/compete" label="Competitor" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 12V5l5-3 5 3v7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/><rect x="5.5" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/><path d="M2 8h3M10 8h3" stroke="currentColor" strokeWidth="1" opacity="0.5"/></svg>
          } />
          <div style={{ margin: "8px 0", borderTop: "1px solid var(--glass-border)" }} />
          <NavItem href="/pricing" label="Upgrade" icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" fill="currentColor" opacity="0.8"/></svg>
          } accent />
        </nav>

        {/* User */}
        <div style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--glass-border)",
          display: "flex", alignItems: "center", gap: "10px",
          background: "oklch(0.12 0.008 230 / 0.5)",
        }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" width={30} height={30}
              style={{ borderRadius: "50%", flexShrink: 0, border: "1.5px solid var(--primary-glow)" }} />
          ) : (
            <div style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: "var(--primary-soft)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 700, color: "var(--primary-2)",
              border: "1.5px solid var(--primary-glow)", flexShrink: 0,
            }}>
              {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name ?? "Account"}
            </div>
            <div style={{ fontSize: "10px", color: "var(--foreground-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "1px" }}>
              {user.email}
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", position: "relative", zIndex: 1 }}>
        {children}
      </main>
    </div>
  )
}

function NavItem({ href, label, icon, accent }: { href: string; label: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "8px 10px", borderRadius: "var(--radius-md)",
      textDecoration: "none", fontSize: "13px", fontWeight: 500,
      color: accent ? "var(--primary-2)" : "var(--foreground-2)",
      transition: "background 150ms, color 150ms",
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.background = accent ? "var(--primary-soft)" : "oklch(0.98 0 0 / 0.04)"
      ;(e.currentTarget as HTMLElement).style.color = accent ? "var(--primary-2)" : "var(--foreground)"
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = "transparent"
      ;(e.currentTarget as HTMLElement).style.color = accent ? "var(--primary-2)" : "var(--foreground-2)"
    }}>
      <span style={{ opacity: accent ? 1 : 0.7, display: "flex", alignItems: "center" }}>{icon}</span>
      {label}
    </Link>
  )
}
