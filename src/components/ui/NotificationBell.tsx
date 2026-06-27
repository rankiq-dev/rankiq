"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  body: string
  href: string
  createdAt: string | null
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem("rankiq_notif_seen")
    if (stored) setLastSeen(stored)

    async function load() {
      try {
        const res = await fetch("/api/v1/notifications")
        const data = await res.json() as { data?: { notifications: Notification[] } }
        if (data.data?.notifications) setNotifications(data.data.notifications)
      } catch { /* ignore */ }
    }
    void load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function handleOpen() {
    setOpen(!open)
    if (!open && notifications.length > 0) {
      const newest = notifications[0]?.createdAt ?? new Date().toISOString()
      setLastSeen(newest)
      localStorage.setItem("rankiq_notif_seen", newest)
    }
  }

  const unread = notifications.filter(n =>
    !lastSeen || (n.createdAt != null && n.createdAt > lastSeen)
  ).length

  function relativeTime(date: string | null) {
    if (!date) return "recently"
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={handleOpen} title="Notifications" style={{
        width: "28px", height: "28px", borderRadius: "8px",
        background: "oklch(0.18 0.006 230)",
        border: "1px solid var(--glass-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0, flexShrink: 0,
        color: "var(--foreground-3)", position: "relative",
      }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 1a4 4 0 0 0-4 4v3l-1 1h10l-1-1V5a4 4 0 0 0-4-4zM5.5 10a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-3px", right: "-3px",
            width: "14px", height: "14px", borderRadius: "50%",
            background: "var(--destructive)", color: "white",
            fontSize: "8px", fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--background)",
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", right: 0,
          width: "300px", maxHeight: "360px",
          background: "oklch(0.14 0.008 230)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          overflow: "hidden", zIndex: 100,
          boxShadow: "0 8px 32px oklch(0 0 0 / 0.4)",
        }}>
          <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--glass-border)", fontSize: "11px", fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Notifications
          </div>
          <div style={{ overflowY: "auto", maxHeight: "300px" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", fontSize: "12px", color: "var(--foreground-3)" }}>
                No recent notifications
              </div>
            ) : notifications.map((n, i) => (
              <Link key={n.id} href={n.href} onClick={() => setOpen(false)} style={{
                display: "block", padding: "10px 16px", textDecoration: "none",
                borderBottom: i < notifications.length - 1 ? "1px solid oklch(0.98 0 0 / 0.04)" : "none",
                background: (!lastSeen || (n.createdAt != null && n.createdAt > lastSeen)) ? "oklch(0.16 0.01 178 / 0.4)" : "transparent",
              }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", marginBottom: "2px" }}>{n.title}</div>
                <div style={{ fontSize: "11px", color: "var(--foreground-3)" }}>{n.body}</div>
                <div style={{ fontSize: "10px", color: "var(--foreground-3)", marginTop: "3px" }}>{relativeTime(n.createdAt)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
