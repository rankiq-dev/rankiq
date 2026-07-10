import * as cheerio from "cheerio"
import type { CrawledPage } from "./types"

export type ExtractedSignals = Omit<CrawledPage, "status" | "redirectedFrom" | "incomingInternalLinks">

/** Resolve a relative href against a base URL; returns null if invalid */
function resolveHref(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

/** Normalize a URL: strip fragment, lowercase host */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.hash = ""
    u.hostname = u.hostname.toLowerCase()
    return u.toString()
  } catch {
    return raw
  }
}

/**
 * Extract SEO signals from raw HTML using Cheerio. Shared by the Cheerio crawler
 * and the Firecrawl crawler (which returns rendered HTML for us to parse the same way).
 */
export function extractSeoSignals(html: string, url: string, domain: string): ExtractedSignals {
  const $ = cheerio.load(html)

  const title = $("title").first().text().trim() || null
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? null
  const metaRobots = $('meta[name="robots"]').attr("content")?.trim() ?? null
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? null
  const h1s = $("h1")
  const h1Count = h1s.length
  const h1Text = h1s.first().text().trim() || null
  const h2Count = $("h2").length
  const h3Count = $("h3").length
  const wordCount = $("body").text().trim().split(/\s+/).filter(Boolean).length

  let imageCount = 0
  let imagesMissingAlt = 0
  $("img").each((_, el) => {
    imageCount++
    const alt = $(el).attr("alt")
    if (alt === undefined || alt.trim() === "") imagesMissingAlt++
  })

  const hasJsonLd = $('script[type="application/ld+json"]').length > 0

  const internalLinks: string[] = []
  const externalLinks: string[] = []

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return
    const resolved = resolveHref(url, href)
    if (!resolved) return
    try {
      const u = new URL(resolved)
      const h = u.hostname.replace(/^www\./, "")
      const d = domain.replace(/^www\./, "")
      if (h === d) {
        internalLinks.push(normalizeUrl(resolved))
      } else {
        externalLinks.push(resolved)
      }
    } catch { /* ignore malformed */ }
  })

  return {
    url,
    title,
    metaDescription,
    metaRobots,
    canonical,
    h1Count,
    h1Text,
    h2Count,
    h3Count,
    internalLinks: Array.from(new Set(internalLinks)),
    externalLinks: Array.from(new Set(externalLinks)),
    wordCount,
    imageCount,
    imagesMissingAlt,
    hasJsonLd,
  }
}
