import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAuditById } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { llm } from "@/providers/llm"
import type { PageAnalysis } from "@/domain/audit/types"

/** POST /api/v1/audits/:id/suggest-titles
 *  Body: { url: string }
 *  Returns 3 AI-generated title tag suggestions for the given page.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { url?: string }
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 })

  const audit = await getAuditById(id)
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const site = await getSiteById(audit.siteId, session.user.id)
  if (!site) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const pageAnalyses = (audit.pageAnalyses as PageAnalysis[] | null) ?? []
  const page = pageAnalyses.find(p => p.url === body.url)

  const context = page
    ? `URL: ${page.url}\nCurrent title: ${page.title ?? "none"}\nH1: ${page.h1Text ?? "none"}\nWord count: ${page.wordCount}`
    : `URL: ${body.url}\nNo page data available`

  const result = await llm.generate({
    system: "You are an expert SEO copywriter. Generate compelling, keyword-rich title tags that drive click-through rate.",
    messages: [{
      role: "user",
      content: `Generate 3 title tag suggestions for this page. Each should be 50-60 characters, include the primary keyword naturally, and be unique. Return ONLY a JSON array of strings, no explanation.\n\n${context}\nSite domain: ${site.domain}`,
    }],
    maxTokens: 200,
  })

  let suggestions: string[] = []
  try {
    suggestions = JSON.parse(result.content.trim())
    if (!Array.isArray(suggestions)) suggestions = []
    suggestions = suggestions.slice(0, 3).filter(s => typeof s === "string")
  } catch {
    // Extract from text if JSON parse fails
    suggestions = result.content.split("\n")
      .filter(l => l.trim().match(/^["']?[1-3][\.\)]|^[-*•]/))
      .map(l => l.replace(/^["']?[1-3][\.\)]\s*["']?|^[-*•]\s*["']?/, "").replace(/["']$/, "").trim())
      .slice(0, 3)
  }

  return NextResponse.json({ data: { suggestions, pageUrl: body.url } })
}
