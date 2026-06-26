import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = session.user

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "oklch(0.10 0.008 230)",
        fontFamily: "var(--font-sans), sans-serif",
        color: "oklch(0.92 0.008 230)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          flexShrink: 0,
          borderRight: "1px solid oklch(0.22 0.006 230)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 0",
          background: "oklch(0.10 0.008 230)",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid oklch(0.22 0.006 230)" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                background: "linear-gradient(135deg, oklch(0.75 0.13 178), oklch(0.80 0.13 196))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.4px",
              }}
            >
              RankIQ
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          <NavItem href="/dashboard" label="Dashboard" icon="⬡" />
          <NavItem href="/sites" label="Sites" icon="◎" />
          <NavItem href="/pricing" label="Upgrade" icon="✦" accent />
        </nav>

        {/* User */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid oklch(0.22 0.006 230)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              width={28}
              height={28}
              style={{ borderRadius: "50%", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "oklch(0.18 0.06 178)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "oklch(0.75 0.13 178)",
                flexShrink: 0,
              }}
            >
              {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "oklch(0.92 0.008 230)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name ?? "Account"}
            </div>
            <div style={{ fontSize: "11px", color: "oklch(0.38 0.008 230)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
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

function NavItem({ href, label, icon, accent }: { href: string; label: string; icon: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 10px",
        borderRadius: "6px",
        textDecoration: "none",
        fontSize: "13px",
        fontWeight: 500,
        color: accent ? "oklch(0.65 0.13 178)" : "oklch(0.65 0.008 230)",
        marginBottom: "2px",
        transition: "background 150ms, color 150ms",
      }}
    >
      <span style={{ fontSize: "14px", opacity: 0.7 }}>{icon}</span>
      {label}
    </Link>
  )
}
