import { signIn } from "@/auth"
import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  return (
    <main style={{
      minHeight: "100vh",
      background: "oklch(0.08 0.010 230)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "var(--font-sans), sans-serif",
      position: "relative",
    }}>
      {/* Background */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 60% at 50% -10%, oklch(0.55 0.13 178 / 0.15), transparent)",
      }} />
      <div aria-hidden style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "300px", pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 80% at 50% 100%, oklch(0.55 0.13 196 / 0.06), transparent)",
      }} />

      <div style={{ width: "100%", maxWidth: "380px", position: "relative" }}>
        {/* Card */}
        <div style={{
          background: "oklch(0.11 0.008 230 / 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid oklch(0.98 0 0 / 0.08)",
          borderRadius: "20px", padding: "40px 36px",
          boxShadow: "0 0 0 1px oklch(0.98 0 0 / 0.06), 0 24px 48px oklch(0 0 0 / 0.5), 0 0 80px oklch(0.55 0.13 178 / 0.05)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "9px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "9px",
                background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
                boxShadow: "0 0 20px oklch(0.55 0.13 178 / 0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 8L8 14L2 8L8 2Z" fill="white" fillOpacity="0.9"/>
                  <path d="M8 5L11 8L8 11L5 8L8 5Z" fill="oklch(0.08 0.010 230)"/>
                </svg>
              </div>
              <span style={{
                fontSize: "22px", fontWeight: 800,
                background: "linear-gradient(135deg, oklch(0.82 0.13 178), oklch(0.88 0.13 196))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px",
              }}>RankIQ</span>
            </Link>
            <p style={{ color: "oklch(0.55 0.008 230)", fontSize: "13px", marginTop: "10px", lineHeight: 1.5 }}>
              AI-Powered SEO Intelligence
            </p>
          </div>

          <h1 style={{
            color: "oklch(0.92 0.008 230)", fontSize: "20px", fontWeight: 700,
            textAlign: "center", marginBottom: "8px", letterSpacing: "-0.4px",
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "13px", color: "oklch(0.50 0.008 230)", textAlign: "center", marginBottom: "28px" }}>
            Sign in to access your SEO dashboard
          </p>

          {/* Google OAuth */}
          <form
            action={async () => {
              "use server"
              const sp = await searchParams
              await signIn("google", { redirectTo: sp.callbackUrl ?? "/dashboard" })
            }}
          >
            <button
              type="submit"
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "10px",
                padding: "13px 16px",
                background: "oklch(0.95 0.005 230)",
                color: "oklch(0.12 0.008 230)",
                border: "none", borderRadius: "10px",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-sans), sans-serif",
                boxShadow: "0 2px 8px oklch(0 0 0 / 0.3)",
                transition: "opacity 150ms, transform 100ms",
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>

          {/* Features preview */}
          <div style={{ marginTop: "28px", padding: "16px", background: "oklch(0.14 0.006 230)", borderRadius: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
              What you&apos;ll get
            </div>
            {[
              "Full SEO audit in 5 minutes",
              "AI action plan ranked by revenue impact",
              "Keyword position tracking via Google Search Console",
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "oklch(0.65 0.008 230)", marginBottom: i < 2 ? "6px" : 0 }}>
                <span style={{ color: "var(--success)", fontSize: "10px" }}>✓</span>
                {f}
              </div>
            ))}
          </div>

          <p style={{ marginTop: "20px", textAlign: "center", fontSize: "11px", color: "oklch(0.35 0.008 230)", lineHeight: 1.6 }}>
            By continuing, you agree to our{" "}
            <a href="/terms" style={{ color: "oklch(0.55 0.13 178)", textDecoration: "none" }}>Terms</a>{" "}
            and{" "}
            <a href="/privacy" style={{ color: "oklch(0.55 0.13 178)", textDecoration: "none" }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
