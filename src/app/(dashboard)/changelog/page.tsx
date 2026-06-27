export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "What's New" }

const CHANGELOG = [
  {
    version: "1.9",
    date: "June 2026",
    tag: "New",
    tagColor: "var(--primary-2)",
    tagBg: "var(--primary-soft)",
    items: [
      "Dark/light mode toggle — saved as a cookie, no flash on load",
      "Side-by-side site comparison for agency users — compare health scores and issue counts",
      "Score impact badge on each issue (e.g. +20 pts) so you prioritise the highest-impact fixes first",
      "Per-issue Mark as Fixed button directly in the expandable issue panel",
      "Crawl delay setting per site (250ms–2s) for polite crawling",
      "Top pages by internal link equity on site overview",
      "Audit JSON export — download full audit data for integrations",
      "Noindex page detector — critical alert when indexable pages are accidentally noindexed",
      "Orphaned page detector + no JSON-LD schema detector",
      "Bulk audit trigger for agency plan — audit all sites in one click",
    ],
  },
  {
    version: "1.8",
    date: "June 2025",
    tag: "New",
    tagColor: "var(--primary-2)",
    tagBg: "var(--primary-soft)",
    items: [
      "Webhook system — fire real-time notifications to your server on audit completion",
      "Embeddable SVG health score badge for your site or README",
      "Quick Scan — instant single-page SEO audit without a full crawl",
      "Bulk mark issues as fixed / unmark all with one click",
      "Live audit progress bar showing pages crawled in real-time",
    ],
  },
  {
    version: "1.7",
    date: "May 2025",
    tag: "Improvement",
    tagColor: "var(--success)",
    tagBg: "var(--success-bg)",
    items: [
      "Expandable issue cards — click any issue to see fix instructions and affected URLs",
      "Client labels for agency sites — group and identify client portfolios",
      "Score sparkline history chart on each site's overview page",
      "Robots.txt + sitemap checker with accessibility and directive analysis",
      "Core Web Vitals (PageSpeed Insights) panel — mobile and desktop comparison",
    ],
  },
  {
    version: "1.6",
    date: "April 2025",
    tag: "New",
    tagColor: "var(--primary-2)",
    tagBg: "var(--primary-soft)",
    items: [
      "Share audits publicly — generate a shareable link for clients or teammates",
      "Thin content and missing image alt text issue detectors",
      "API key management — create named keys with SHA-256 hashing",
      "Weekly digest emails — portfolio score summary every Monday",
      "PDF report export for completed audits",
    ],
  },
  {
    version: "1.5",
    date: "March 2025",
    tag: "Improvement",
    tagColor: "var(--success)",
    tagBg: "var(--success-bg)",
    items: [
      "Category breakdown pie chart on audit results page",
      "Issue severity and category filter pills",
      "CSV export of all audit issues",
      "Competitor analysis — side-by-side homepage SEO comparison",
      "Google Search Console integration with keyword position tracking",
    ],
  },
  {
    version: "1.0",
    date: "February 2025",
    tag: "Launch",
    tagColor: "oklch(0.70 0.18 310)",
    tagBg: "oklch(0.70 0.18 310 / 0.1)",
    items: [
      "Technical SEO crawler — up to 500 pages per crawl",
      "AI-powered action plan generation via Claude",
      "Health score (0–100) computed from weighted issue penalties",
      "Agency multi-site portfolio dashboard",
      "Scheduled weekly auto-audits for Growth and Agency plans",
    ],
  },
]

export default async function ChangelogPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div style={{ padding: "32px 40px", maxWidth: "740px" }}>
      <div style={{ marginBottom: "36px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "3px 10px", borderRadius: "20px",
          background: "var(--primary-soft)", border: "1px solid oklch(0.55 0.13 178 / 0.3)",
          fontSize: "9px", fontWeight: 700, color: "var(--primary-2)",
          textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px",
        }}>Release notes</div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.6px", marginBottom: "6px" }}>
          What&apos;s New
        </h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.65 }}>
          The latest features, improvements, and fixes in RankIQ.
        </p>
      </div>

      <div style={{ position: "relative" }}>
        {/* Timeline line */}
        <div style={{
          position: "absolute", left: "20px", top: "8px", bottom: "0",
          width: "1px", background: "var(--glass-border)",
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {CHANGELOG.map(entry => (
            <div key={entry.version} style={{ display: "flex", gap: "24px", paddingLeft: "8px" }}>
              {/* Dot */}
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                background: "var(--glass-bg)", border: "2px solid var(--primary-glow)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1,
              }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)" }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.3px", margin: 0 }}>
                    v{entry.version}
                  </h2>
                  <span style={{
                    padding: "2px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 700,
                    background: entry.tagBg, color: entry.tagColor,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>{entry.tag}</span>
                  <span style={{ fontSize: "11px", color: "var(--foreground-3)", marginLeft: "auto" }}>{entry.date}</span>
                </div>

                <div style={{
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-xl)", padding: "16px 20px",
                }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {entry.items.map(item => (
                      <li key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.55 }}>
                        <span style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }}>✦</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
