import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
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
        <h1 style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-0.8px", marginBottom: "8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: "13px", color: "oklch(0.45 0.008 230)", marginBottom: "40px" }}>Last updated: June 2025</p>

        {[
          ["Information We Collect", "We collect your name and email via Google OAuth when you sign in. We collect the domain names and audit data for sites you add. We collect usage analytics (pages visited, features used) via anonymized analytics. We do not collect payment information directly — payments are processed by Stripe."],
          ["How We Use Your Data", "We use your data to: provide the RankIQ service, run SEO audits, display keyword data from Google Search Console, and improve the product. We never sell your data to third parties."],
          ["Google Search Console Data", "When you connect GSC, we import keyword position data on your behalf via the Google Search Console API. This data is stored in our database and displayed only to you. You can disconnect at any time from your site settings."],
          ["Data Retention", "Audit data is retained as long as your account is active. Site data is deleted within 30 days of you deleting a site. Account data is deleted within 30 days of account closure."],
          ["Third-Party Services", "We use: Vercel (hosting), Neon (database), Upstash (queue/cache), Stripe (payments), Google OAuth (authentication). Each service has its own privacy policy governing data they process."],
          ["Security", "We use HTTPS, bcrypt-equivalent hashing, and tenant-isolated data access. Sensitive credentials (API keys, OAuth tokens) are stored encrypted."],
          ["Your Rights", "You may request a copy of your data, correction of inaccurate data, or deletion of your account at any time by contacting us at privacy@rankiq.app."],
          ["Cookies", "We use only essential session cookies required for authentication. We do not use advertising or tracking cookies."],
          ["Contact", "For privacy inquiries, contact privacy@rankiq.app."],
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
