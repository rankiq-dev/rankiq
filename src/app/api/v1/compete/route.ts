import { auth } from "@/auth"
import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

interface SiteData {
  url: string
  title: string | null
  description: string | null
  h1: string | null
  h1Count: number
  wordCount: number
  internalLinks: number
  externalLinks: number
  hasSchema: boolean
  canonical: string | null
  score: number
  issues: string[]
}

async function fetchSiteData(domain: string): Promise<SiteData> {
  const url = `https://${domain.replace(/^https?:\/\//, "")}`
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RankIQ-Bot/1.0; +https://rankiq.app/bot)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  })

  const html = await response.text()
  const $ = cheerio.load(html)

  const title = $("title").first().text().trim() || null
  const description = $('meta[name="description"]').attr("content")?.trim() ?? null
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? null
  const h1s = $("h1")
  const h1Count = h1s.length
  const h1 = h1s.first().text().trim() || null
  const wordCount = $("body").text().trim().split(/\s+/).filter(Boolean).length
  const hasSchema = $('script[type="application/ld+json"]').length > 0

  const baseDomain = new URL(url).hostname

  let internalLinks = 0
  let externalLinks = 0
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return
    try {
      const u = new URL(href, url)
      if (u.hostname === baseDomain || u.hostname === `www.${baseDomain}`) {
        internalLinks++
      } else {
        externalLinks++
      }
    } catch { /* ignore */ }
  })

  /* Calculate on-page score */
  const issues: string[] = []
  let score = 100

  if (!title) { score -= 20; issues.push("Missing title tag") }
  else if (title.length < 30) { score -= 5; issues.push("Title tag too short") }
  else if (title.length > 60) { score -= 5; issues.push("Title tag too long") }

  if (!description) { score -= 10; issues.push("Missing meta description") }
  else if (description.length < 100) { score -= 3; issues.push("Meta description too short") }
  else if (description.length > 160) { score -= 3; issues.push("Meta description too long") }

  if (h1Count === 0) { score -= 15; issues.push("Missing H1 tag") }
  else if (h1Count > 1) { score -= 5; issues.push(`Multiple H1 tags (${h1Count})`) }

  if (!canonical) { score -= 5; issues.push("No canonical tag") }
  if (!hasSchema) { score -= 5; issues.push("No schema markup") }
  if (wordCount < 300) { score -= 5; issues.push("Thin content (< 300 words)") }
  if (internalLinks < 3) { score -= 5; issues.push("Few internal links") }

  return {
    url,
    title,
    description,
    h1,
    h1Count,
    wordCount,
    internalLinks,
    externalLinks,
    hasSchema,
    canonical,
    score: Math.max(0, score),
    issues,
  }
}

function generateInsights(your: SiteData, comp: SiteData): string[] {
  const insights: string[] = []

  if (your.score > comp.score) {
    insights.push(`Your site scores ${your.score - comp.score} points higher than the competitor (${your.score} vs ${comp.score}).`)
  } else if (comp.score > your.score) {
    insights.push(`The competitor outscores you by ${comp.score - your.score} points (${comp.score} vs ${your.score}). Focus on the gaps below.`)
  }

  if (!your.description && comp.description) {
    insights.push("Your site is missing a meta description — the competitor has one. This hurts click-through rates in search results.")
  }

  if (!your.hasSchema && comp.hasSchema) {
    insights.push("The competitor uses schema markup (structured data) which can unlock rich snippets in Google — you should add it too.")
  }

  if (comp.wordCount > your.wordCount * 1.5) {
    insights.push(`The competitor's homepage has ${comp.wordCount.toLocaleString()} words vs your ${your.wordCount.toLocaleString()} — more content generally signals more topical authority.`)
  } else if (your.wordCount > comp.wordCount * 1.5) {
    insights.push(`Your site has significantly more content (${your.wordCount.toLocaleString()} vs ${comp.wordCount.toLocaleString()} words) — this is an advantage for topical depth.`)
  }

  if (your.internalLinks < comp.internalLinks) {
    insights.push(`The competitor links to ${comp.internalLinks} internal pages from the homepage vs your ${your.internalLinks}. More internal links distribute link equity better.`)
  }

  if (!your.h1 && comp.h1) {
    insights.push("You're missing an H1 tag on your homepage — the competitor has one. The H1 is a primary on-page ranking signal.")
  }

  if (insights.length === 0) {
    insights.push("Both sites are similarly optimised. To find deeper gaps, run a full audit on your site from the dashboard.")
  }

  return insights.slice(0, 5)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as { yourDomain?: string; compDomain?: string }
  const { yourDomain, compDomain } = body

  if (!yourDomain || !compDomain) {
    return NextResponse.json({ error: "Both domains are required" }, { status: 400 })
  }

  try {
    const [your, competitor] = await Promise.all([
      fetchSiteData(yourDomain),
      fetchSiteData(compDomain),
    ])

    const insights = generateInsights(your, competitor)

    return NextResponse.json({ your, competitor, insights })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch site data"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
