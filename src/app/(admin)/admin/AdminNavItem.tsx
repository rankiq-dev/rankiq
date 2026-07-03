"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AdminNavItem({
  href, label, icon, exact,
}: { href: string; label: string; icon: React.ReactNode; exact?: boolean }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "9px 12px", borderRadius: "8px",
      fontSize: "13px", fontWeight: 600, textDecoration: "none",
      color: active ? "oklch(0.92 0.005 25)" : "oklch(0.55 0.008 25)",
      background: active ? "oklch(0.55 0.20 27 / 0.15)" : "transparent",
      border: active ? "1px solid oklch(0.55 0.20 27 / 0.3)" : "1px solid transparent",
      transition: "all 0.15s ease",
    }}>
      <span style={{ color: active ? "oklch(0.65 0.20 27)" : "currentColor", display: "flex" }}>{icon}</span>
      {label}
    </Link>
  )
}
