"use client"
import Link from "next/link"

export function NavItem({ href, label, icon, accent }: { href: string; label: string; icon: React.ReactNode; accent?: boolean }) {
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
