export const dynamic = "force-dynamic"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { PageAnalysis } from "@/domain/audit/types"
import { ContentBriefClient } from "./ContentBriefClient"

export const metadata: Metadata = { title: "Content Brief" }

export default async function ContentBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ url?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const sp = await searchParams
  const targetUrl = sp.url

  const audit = await getAuditById(id)
  if (!audit) notFound()

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) notFound()

  if (audit.status !== "complete") {
    redirect(`/audits/${id}`)
  }

  const pages = (audit.pageAnalyses as PageAnalysis[] | null) ?? []
  const page = targetUrl
    ? pages.find(p => p.url === targetUrl || p.url.replace(/^https?:\/\/[^/]+/, "") === targetUrl)
    : null

  // If no specific URL, show the page selector
  const lowScorePages = pages
    .filter(p => !p.isNoindex)
    .sort((a, b) => a.onPageScore - b.onPageScore)
    .slice(0, 20)

  return (
    <div style={{ padding: "32px 40px", maxWidth: "860px" }}>
      <Link href={`/audits/${id}`} style={{ fontSize: "12px", color: "var(--foreground-3)", textDecoration: "none" }}>
        ← Back to audit
      </Link>

      <div style={{ marginTop: "16px", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--foreground)", marginBottom: "6px" }}>
          ✦ AI Content Brief
        </h1>
        <p style={{ fontSize: "13px", color: "var(--foreground-2)", lineHeight: 1.6 }}>
          Generate an AI-powered content brief for any page — target word count, keyword strategy, H2 structure, and priority fixes.
        </p>
      </div>

      {page ? (
        <ContentBriefClient
          auditId={id}
          url={page.url}
          path={page.url.replace(/^https?:\/\/[^/]+/, "") || "/"}
          currentScore={page.onPageScore}
          currentWordCount={page.wordCount ?? 0}
        />
      ) : (
        <div style={{
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
          padding: "20px 24px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
            Select a page to generate a brief
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {lowScorePages.map(p => {
              const path = p.url.replace(/^https?:\/\/[^/]+/, "") || "/"
              const color = p.onPageScore < 50 ? "var(--destructive)" : p.onPageScore < 75 ? "var(--warning)" : "var(--success)"
              return (
                <Link
                  key={p.url}
                  href={`/audits/${id}/content-brief?url=${encodeURIComponent(p.url)}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 14px", borderRadius: "var(--radius-lg)",
                    background: "oklch(0.14 0.006 230)", border: "1px solid var(--glass-border)",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ flex: 1, fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{path}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color, flexShrink: 0 }}>{p.onPageScore}/100</span>
                  <span style={{ fontSize: "11px", color: "var(--foreground-3)", flexShrink: 0 }}>{(p.wordCount ?? 0).toLocaleString()}w</span>
                  <span style={{ fontSize: "11px", color: "var(--primary-2)", flexShrink: 0 }}>Brief →</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
