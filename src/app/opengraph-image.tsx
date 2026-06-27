import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "RankIQ — AI-Powered SEO Co-pilot"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0e1a 0%, #0d1425 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "-100px", left: "50%",
          width: "800px", height: "400px",
          background: "radial-gradient(ellipse, rgba(13, 148, 136, 0.15) 0%, transparent 70%)",
          transform: "translateX(-50%)",
          display: "flex",
        }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "40px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "linear-gradient(135deg, #0d9488, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "28px", height: "28px",
              background: "white",
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              display: "flex",
            }} />
          </div>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "#0d9488", letterSpacing: "-1px" }}>
            RankIQ
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "68px", fontWeight: 900, lineHeight: 1.05,
          letterSpacing: "-2px", margin: 0, marginBottom: "24px",
          background: "linear-gradient(135deg, #f1f5f9, #94a3b8)",
          backgroundClip: "text",
          color: "transparent",
          maxWidth: "900px",
        }}>
          AI-Powered SEO<br />Co-pilot
        </h1>

        {/* Subheading */}
        <p style={{
          fontSize: "26px", color: "#64748b", margin: 0, marginBottom: "48px",
          lineHeight: 1.5, maxWidth: "700px",
        }}>
          Full SEO audit + AI action plan ranked by revenue impact. In under 5 minutes.
        </p>

        {/* CTA pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          background: "rgba(13, 148, 136, 0.15)",
          border: "1px solid rgba(13, 148, 136, 0.4)",
          borderRadius: "40px", padding: "12px 28px",
        }}>
          <div style={{
            width: "10px", height: "10px", borderRadius: "50%",
            background: "#0d9488",
            display: "flex",
          }} />
          <span style={{ fontSize: "20px", fontWeight: 700, color: "#0d9488" }}>
            Free to start · No credit card required
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
