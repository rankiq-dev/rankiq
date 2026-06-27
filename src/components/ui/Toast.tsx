"use client"
import { createContext, useContext, useState, useCallback, useEffect } from "react"

type ToastType = "success" | "error" | "info" | "warning"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const colors: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: "var(--success-bg)", border: "oklch(0.68 0.16 155 / 0.4)", color: "var(--success)" },
    error:   { bg: "var(--destructive-bg)", border: "oklch(0.65 0.20 27 / 0.4)", color: "var(--destructive)" },
    warning: { bg: "var(--warning-bg)", border: "oklch(0.80 0.15 75 / 0.4)", color: "var(--warning)" },
    info:    { bg: "var(--info-bg)", border: "oklch(0.70 0.12 230 / 0.4)", color: "var(--info)" },
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: "fixed", bottom: "24px", right: "24px",
        display: "flex", flexDirection: "column", gap: "8px",
        zIndex: 9999, pointerEvents: "none",
      }}>
        {toasts.map(t => {
          const c = colors[t.type]
          return (
            <div key={t.id} style={{
              pointerEvents: "all",
              display: "flex", alignItems: "center", gap: "10px",
              padding: "11px 16px",
              background: c.bg, backdropFilter: "blur(20px)",
              border: `1px solid ${c.border}`,
              borderRadius: "10px", maxWidth: "360px",
              boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
              animation: "fadeIn 200ms ease-out forwards",
              fontFamily: "var(--font-sans), sans-serif",
            }}>
              <span style={{ fontSize: "13px", color: c.color, fontWeight: 600, lineHeight: 1.4 }}>{t.message}</span>
              <button onClick={() => remove(t.id)} style={{
                marginLeft: "auto", background: "transparent", border: "none",
                color: c.color, opacity: 0.6, cursor: "pointer", padding: "0 2px",
                fontSize: "14px", lineHeight: 1, flexShrink: 0,
              }}>✕</button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}

/** Standalone toast hook for pages that may not have the provider — no-ops if not available */
export function useOptionalToast(): { toast: (m: string, t?: ToastType) => void } {
  const ctx = useContext(ToastContext)
  return ctx ?? { toast: () => {} }
}
