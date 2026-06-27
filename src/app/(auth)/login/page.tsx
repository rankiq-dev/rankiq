import { signIn } from "@/auth"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "oklch(0.10 0.008 230)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "var(--font-sans), sans-serif",
      }}
    >
      {/* Background gradient orb */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.55 0.13 178 / 0.12), transparent)",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "oklch(0.12 0.008 230 / 0.60)",
          backdropFilter: "blur(20px) saturate(1.4)",
          border: "1px solid oklch(0.98 0 0 / 0.06)",
          borderRadius: "14px",
          padding: "40px 36px",
          boxShadow: "0 0 0 1px oklch(0.98 0 0 / 0.06), 0 8px 24px oklch(0 0 0 / 0.5)",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, oklch(0.55 0.13 178), oklch(0.65 0.13 196))",
              }}
            />
            <span
              style={{
                fontSize: "22px",
                fontWeight: 800,
                background: "linear-gradient(135deg, oklch(0.75 0.13 178), oklch(0.80 0.13 196))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px",
              }}
            >
              RankIQ
            </span>
          </div>
          <p
            style={{
              color: "oklch(0.65 0.008 230)",
              fontSize: "13px",
              marginTop: "4px",
            }}
          >
            SEO co-pilot for business owners
          </p>
        </div>

        <h1
          style={{
            color: "oklch(0.92 0.008 230)",
            fontSize: "20px",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "24px",
            letterSpacing: "-0.3px",
          }}
        >
          Welcome back
        </h1>

        {/* Google OAuth form — server action */}
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
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "11px 16px",
              background: "oklch(0.92 0.008 230)",
              color: "oklch(0.10 0.008 230)",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans), sans-serif",
              transition: "opacity 150ms",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "12px",
            color: "oklch(0.38 0.008 230)",
            lineHeight: 1.6,
          }}
        >
          By continuing, you agree to RankIQ&apos;s{" "}
          <a href="/terms" style={{ color: "oklch(0.65 0.13 178)", textDecoration: "none" }}>
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" style={{ color: "oklch(0.65 0.13 178)", textDecoration: "none" }}>
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
