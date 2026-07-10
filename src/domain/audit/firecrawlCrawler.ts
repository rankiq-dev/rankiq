import { logger } from "@/infra/logger"
import { extractSeoSignals, normalizeUrl } from "./extractSeoSignals"
import type { CrawledPage, CrawlResult } from "./types"

const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape"

interface FirecrawlScrapeResponse {
  success: boolean
  data?: {
    html?: string
    metadata?: { statusCode?: number; [k: string]: unknown }
  }
  error?: string
}

function isSameDomain(url: string, domain: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "")
    const d = domain.replace(/^www\./, "")
    return h === d
  } catch {
    return false
  }
}

/** Scrape a single URL via Firecrawl's hosted rendering + anti-bot proxy. */
async function scrapeOne(url: string, apiKey: string): Promise<{ html: string; status: number } | null> {
  const res = await fetch(FIRECRAWL_SCRAPE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["html"],
      onlyMainContent: false,
      timeout: 25_000,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    logger.warn({ url, httpStatus: res.status }, "Firecrawl scrape HTTP error")
    return null
  }

  const json = (await res.json()) as FirecrawlScrapeResponse
  if (!json.success || !json.data?.html) {
    logger.warn({ url, error: json.error }, "Firecrawl scrape returned no HTML")
    return null
  }

  return { html: json.data.html, status: json.data.metadata?.statusCode ?? 200 }
}

/**
 * Firecrawl-based crawler — hosted rendering + anti-bot bypass, no local browser needed.
 * Used as the primary fallback when the static Cheerio crawler returns 0 pages
 * (blocked, JS-rendered, or otherwise unreachable via plain HTTP).
 */
export async function crawlSiteWithFirecrawl(domain: string, opts: { maxPages: number; timeoutMs: number }): Promise<CrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set — cannot use Firecrawl crawler")
  }

  const startUrl = `https://${domain}`
  const startedAt = Date.now()

  const pages: CrawledPage[] = []
  const visited = new Set<string>()
  const queue: string[] = [startUrl]
  const statusMap = new Map<string, number>()
  const brokenLinks: CrawlResult["brokenLinks"] = []

  const deadline = startedAt + opts.timeoutMs

  while (queue.length > 0 && pages.length < opts.maxPages && Date.now() < deadline) {
    const rawUrl = queue.shift()!
    const url = normalizeUrl(rawUrl)
    if (visited.has(url)) continue
    visited.add(url)

    try {
      const result = await scrapeOne(url, apiKey)
      if (!result) {
        statusMap.set(url, 0)
        continue
      }

      statusMap.set(url, result.status)
      if (result.status >= 400) continue

      const signals = extractSeoSignals(result.html, url, domain)

      pages.push({
        ...signals,
        status: result.status,
        redirectedFrom: null,
        incomingInternalLinks: 0,
      })

      for (const link of signals.internalLinks) {
        const norm = normalizeUrl(link)
        if (!visited.has(norm) && isSameDomain(norm, domain)) {
          queue.push(norm)
        }
      }

      logger.debug({ url, title: signals.title }, "Firecrawl page scraped")
    } catch (err) {
      logger.warn({ url, err }, "Firecrawl scrape failed for page — skipping")
      statusMap.set(url, 0)
    }
  }

  /* Second pass: incoming link counts */
  const incomingCount = new Map<string, number>()
  for (const page of pages) {
    for (const href of page.internalLinks) {
      incomingCount.set(href, (incomingCount.get(href) ?? 0) + 1)
    }
  }
  for (const page of pages) {
    page.incomingInternalLinks = incomingCount.get(page.url) ?? 0
  }

  /* Broken links from pages we actually visited */
  for (const page of pages) {
    for (const href of page.internalLinks) {
      const s = statusMap.get(normalizeUrl(href))
      if (s !== undefined && s >= 400) {
        brokenLinks.push({ from: page.url, to: href, status: s })
      }
    }
  }

  const durationMs = Date.now() - startedAt
  logger.info({ domain, pagesCount: pages.length, durationMs, method: "firecrawl" }, "Firecrawl crawl complete")

  return {
    domain,
    pages,
    brokenLinks,
    redirectChains: [],
    crawledAt: new Date().toISOString(),
    durationMs,
  }
}
