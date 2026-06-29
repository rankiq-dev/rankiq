"use client"

export function CopyPlanLinkButton({ auditId }: { auditId: string }) {
  const copy = () => {
    const url = `${window.location.origin}/audits/${auditId}/action-plan`
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById("copy-plan-btn")
      if (btn) { btn.textContent = "✓ Copied!"; setTimeout(() => { btn.textContent = "Copy link" }, 2000) }
    })
  }
  return (
    <button
      id="copy-plan-btn"
      onClick={copy}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "8px 16px", fontSize: "12px", fontWeight: 600,
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-md)", color: "var(--foreground-2)",
        cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      Copy link
    </button>
  )
}
