import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { getKeywordPositionChanges } from "@/db/repositories/gsc"
import type { PageAnalysis } from "@/domain/audit/types"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

/**
 * POST /api/v1/audits/:id/content-brief
 * Body: { url: string }
 * Generates an AI content brief for a specific page based on its current on-page data + keyword context.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { url?: string }
  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 })
  }

  const pages = audit.pageAnalyses ? (audit.pageAnalyses as PageAnalysis[]) : []
  const page = pages.find(p => p.url === body.url || p.url.replace(/^https?:\/\/[^/]+/, "") === body.url)
  if (!page) return NextResponse.json({ error: "Page not found in audit" }, { status: 404 })

  const keywords = site.gscConnected ? await getKeywordPositionChanges(audit.siteId, 50) : []
  const relatedKeywords = keywords
    .filter(k => page.url.toLowerCase().includes(k.keyword.toLowerCase().replace(/\s+/g, "-")) ||
      page.title?.toLowerCase().includes(k.keyword.toLowerCase()))
    .slice(0, 5)
    .map(k => `${k.keyword} (pos ${parseFloat(k.positionAvg).toFixed(0)}, ${k.impressions} impr)`)

  const path = page.url.replace(/^https?:\/\/[^/]+/, "") || "/"

  const prompt = `You are an SEO content strategist. Generate a concise content brief for a web page.

PAGE DATA:
- URL path: ${path}
- Current title: ${page.title ?? "(missing)"}
- Current H1: ${page.h1Text ?? "(missing)"}
- Word count: ${page.wordCount ?? 0} words
- On-page score: ${page.onPageScore}/100
- H2 count: ${page.h2Count ?? 0}
- Has schema markup: ${page.hasJsonLd ? "yes" : "no"}
- Has canonical: ${page.hasCanonical ? "yes" : "no"}
${relatedKeywords.length > 0 ? `- GSC keywords this page ranks for: ${relatedKeywords.join(", ")}` : ""}

Generate a JSON content brief with these exact fields:
{
  "recommendedTitle": "string (50-60 chars, includes primary keyword)",
  "recommendedH1": "string (different from title, 40-70 chars)",
  "targetWordCount": number (realistic target based on current content),
  "primaryKeyword": "string",
  "secondaryKeywords": ["string", "string", "string"],
  "recommendedH2s": ["string", "string", "string", "string"],
  "contentGaps": ["string", "string", "string"],
  "schemaType": "string (e.g. Article, Product, FAQPage, LocalBusiness, or null)",
  "priorityFixes": ["string", "string", "string"]
}`

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0]?.type === "text" ? message.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: "Failed to generate brief" }, { status: 502 })

    const brief = JSON.parse(jsonMatch[0]) as Record<string, unknown>

    return NextResponse.json({
      data: {
        auditId: id,
        url: page.url,
        path,
        currentScore: page.onPageScore,
        currentWordCount: page.wordCount ?? 0,
        brief,
      },
    })
  } catch {
    return NextResponse.json({ error: "Content brief generation failed" }, { status: 502 })
  }
}
