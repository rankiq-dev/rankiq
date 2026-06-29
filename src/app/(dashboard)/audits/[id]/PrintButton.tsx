"use client"
export function PrintButton() {
  return (
    <button onClick={() => window.print()} style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "7px 12px", fontSize: "12px", fontWeight: 600,
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-md)", color: "var(--foreground-3)",
      cursor: "pointer", fontFamily: "var(--font-sans), sans-serif",
    }}>
      🖨 Print
    </button>
  )
}
