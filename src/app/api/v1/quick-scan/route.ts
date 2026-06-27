import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

interface QuickScanResult {
  url: string
  title: string | null
  metaDescription: string | null
  h1Count: number
  h1Text: string | null
  wordCount: number
  hasCanonical: boolean
  hasJsonLd: boolean
  imagesMissingAlt: number
  issues: Array<{ type: string; severity: "critical" | "warning" | "info"; message: string }>
  score: number
}

/** POST /api/v1/quick-scan — single-page on-page SEO audit (no crawl) */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { url?: string }
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 })

  let url = body.url.trim()
  if (!url.startsWith("http")) url = `https://${url}`

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RankIQ/1.0; +https://rankiq.app)" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    })

    const html = await res.text()

    // Extract basic signals from HTML string (no DOM parser — regex-based)
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim() ?? null
    const h1s = (html.match(/<h1[^>]*>/gi) ?? []).length
    const h1Text = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)?.[1]?.trim() ?? null
    const words = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(w => w.length > 3).length
    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html)
    const hasJsonLd = html.includes('type="application/ld+json"') || html.includes("type='application/ld+json'")
    const imgTags = (html.match(/<img[^>]*/gi) ?? [])
    const imgMissingAlt = imgTags.filter(t => !t.includes("alt=") || /alt=["']\s*["']/.test(t)).length

    const issues: QuickScanResult["issues"] = []
    let penalty = 0

    if (!title) { issues.push({ type: "missing_title", severity: "critical", message: "Missing <title> tag" }); penalty += 20 }
    else if (title.length < 10) { issues.push({ type: "short_title", severity: "warning", message: `Title too short (${title.length} chars)` }); penalty += 5 }
    else if (title.length > 70) { issues.push({ type: "long_title", severity: "warning", message: `Title too long (${title.length} chars)` }); penalty += 5 }

    if (!desc) { issues.push({ type: "missing_meta_description", severity: "critical", message: "Missing meta description" }); penalty += 15 }
    else if (desc.length < 50) { issues.push({ type: "short_description", severity: "warning", message: `Meta description too short (${desc.length} chars)` }); penalty += 5 }
    else if (desc.length > 165) { issues.push({ type: "long_description", severity: "warning", message: `Meta description too long (${desc.length} chars)` }); penalty += 3 }

    if (h1s === 0) { issues.push({ type: "missing_h1", severity: "critical", message: "Missing H1 tag" }); penalty += 15 }
    else if (h1s > 1) { issues.push({ type: "multiple_h1", severity: "warning", message: `Multiple H1 tags (${h1s})` }); penalty += 8 }

    if (words < 300) { issues.push({ type: "thin_content", severity: "warning", message: `Low word count (~${words} words)` }); penalty += 8 }

    if (!hasCanonical) { issues.push({ type: "missing_canonical", severity: "info", message: "No canonical tag found" }); penalty += 3 }
    if (!hasJsonLd) { issues.push({ type: "no_schema", severity: "info", message: "No JSON-LD schema markup" }); penalty += 2 }
    if (imgMissingAlt > 0) { issues.push({ type: "missing_alt", severity: "warning", message: `${imgMissingAlt} image(s) missing alt text` }); penalty += Math.min(imgMissingAlt * 2, 10) }

    const score = Math.max(0, Math.min(100, 100 - penalty))

    const result: QuickScanResult = {
      url: res.url,
      title, metaDescription: desc, h1Count: h1s, h1Text, wordCount: words,
      hasCanonical, hasJsonLd, imagesMissingAlt: imgMissingAlt,
      issues, score,
    }

    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: `Scan failed: ${(e as Error).message}` }, { status: 502 })
  }
}
