export function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={{
      background: "oklch(0.10 0.010 25)", border: "1px solid oklch(0.30 0.05 25 / 0.3)",
      borderRadius: "12px", padding: "16px 18px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: "9px", fontWeight: 700, color: "oklch(0.55 0.008 25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <div style={{ fontSize: "24px", fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
          {value.toLocaleString()}
        </div>
        {sub && <div style={{ fontSize: "10px", color: "oklch(0.50 0.008 25)" }}>{sub}</div>}
      </div>
    </div>
  )
}
