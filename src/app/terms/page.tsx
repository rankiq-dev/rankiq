import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <main style={{
      minHeight: "100vh", background: "oklch(0.08 0.010 230)",
      fontFamily: "var(--font-sans), sans-serif", color: "oklch(0.92 0.008 230)",
      padding: "60px 24px 80px",
    }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "12px", color: "oklch(0.55 0.13 178)", textDecoration: "none", display: "inline-block", marginBottom: "32px" }}>
          ← Back to RankIQ
        </Link>
        <h1 style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-0.8px", marginBottom: "8px" }}>Terms of Service</h1>
        <p style={{ fontSize: "13px", color: "oklch(0.45 0.008 230)", marginBottom: "40px" }}>Last updated: June 2025</p>

        {[
          ["Acceptance", "By accessing or using RankIQ, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you do not have permission to access the service."],
          ["Use License", "RankIQ grants you a limited, non-exclusive, non-transferable license to use the service for your internal business purposes. You may not resell, redistribute, or sublicense access to RankIQ."],
          ["Account Responsibilities", "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use."],
          ["Prohibited Uses", "You may not use RankIQ to: crawl sites you do not own or have permission to audit; attempt to reverse-engineer the service; use automated means to abuse the platform; or violate any applicable laws."],
          ["Payment & Cancellation", "Paid plans are billed monthly. You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period — no pro-rata refunds are provided."],
          ["Data & Privacy", "We collect only the data necessary to provide the service. See our Privacy Policy for details on how we handle your data."],
          ["Limitation of Liability", "RankIQ is provided \"as is\" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service."],
          ["Changes to Terms", "We may update these terms at any time. Continued use of RankIQ after changes constitutes acceptance of the revised terms."],
          ["Contact", "For questions about these terms, email us at legal@rankiq.app."],
        ].map(([title, body]) => (
          <div key={title} style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "oklch(0.92 0.008 230)", marginBottom: "8px" }}>{title}</h2>
            <p style={{ fontSize: "14px", color: "oklch(0.60 0.008 230)", lineHeight: 1.8 }}>{body}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
