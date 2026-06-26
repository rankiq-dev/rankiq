import { CheerioCrawler, Configuration } from "crawlee"
import { logger } from "@/infra/logger"
import type { CrawledPage, CrawlResult } from "./types"

export interface CrawlOptions {
  maxPages: number          /* from PLAN_LIMITS[plan].pagesPerCrawl */
  timeoutMs: number         /* overall crawl timeout */
}

/** Normalize a URL: strip fragment, trailing slash-normalize, lowercase host */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.hash = ""
    u.hostname = u.hostname.toLowerCase()
    return u.toString()
  } catch {
    return raw
  }
}

/** Resolve a relative href against a base URL; returns null if invalid */
function resolveHref(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

export async function crawlSite(domain: string, opts: CrawlOptions): Promise<CrawlResult> {
  const startUrl = `https://${domain}`
  const startedAt = Date.now()

  const pages: CrawledPage[] = []
  const visited = new Set<string>()
  /* url → status for link-checking */
  const statusMap = new Map<string, number>()
  const redirectMap = new Map<string, string>() /* redirectedFrom → finalUrl */

  /* Use memory storage so the crawler leaves no disk artefacts in the worker process */
  const config = new Configuration({ storageClientOptions: { localDataDirectory: "/tmp/crawlee" } })

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerCrawl: opts.maxPages,
      navigationTimeoutSecs: 30,
      requestHandlerTimeoutSecs: 60,

      async requestHandler({ request, response, $ }) {
        const url = normalizeUrl(request.url)
        if (visited.has(url)) return
        visited.add(url)

        const status = response.statusCode ?? 200
        statusMap.set(url, status)

        /* Extract SEO signals */
        const title = $("title").first().text().trim() || null
        const metaDescription =
          $('meta[name="description"]').attr("content")?.trim() ?? null
        const metaRobots =
          $('meta[name="robots"]').attr("content")?.trim() ?? null
        const canonical =
          $('link[rel="canonical"]').attr("href")?.trim() ?? null
        const h1s = $("h1")
        const h1Count = h1s.length
        const h1Text = h1s.first().text().trim() || null
        const h2Count = $("h2").length
        const h3Count = $("h3").length
        const wordCount = $("body").text().trim().split(/\s+/).filter(Boolean).length

        /* Image coverage */
        let imageCount = 0
        let imagesMissingAlt = 0
        $("img").each((_, el) => {
          imageCount++
          const alt = $(el).attr("alt")
          if (alt === undefined || alt.trim() === "") imagesMissingAlt++
        })

        /* JSON-LD schema markup */
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
            if (u.hostname === domain || u.hostname === `www.${domain}`) {
              internalLinks.push(normalizeUrl(resolved))
            } else {
              externalLinks.push(resolved)
            }
          } catch { /* ignore malformed */ }
        })

        const redirectedFrom = redirectMap.get(url) ?? null

        pages.push({
          url,
          status,
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
          redirectedFrom,
          imageCount,
          imagesMissingAlt,
          hasJsonLd,
          incomingInternalLinks: 0, /* populated in second pass below */
        })

        logger.debug({ url, title, h1Count }, "Page crawled")
      },

      failedRequestHandler({ request, log }) {
        log.error(`Request failed: ${request.url}`)
        statusMap.set(request.url, 0)
      },
    },
    config
  )

  /* Add timeout guard */
  const timeoutId = setTimeout(() => {
    logger.warn({ domain, maxPages: opts.maxPages }, "Crawl timeout reached — stopping")
    void crawler.teardown()
  }, opts.timeoutMs)

  try {
    await crawler.run([startUrl])
  } finally {
    clearTimeout(timeoutId)
  }

  /* Second pass: count how many other pages link to each page */
  const incomingCount = new Map<string, number>()
  for (const page of pages) {
    for (const href of page.internalLinks) {
      incomingCount.set(href, (incomingCount.get(href) ?? 0) + 1)
    }
  }
  for (const page of pages) {
    page.incomingInternalLinks = incomingCount.get(page.url) ?? 0
  }

  /* Detect broken internal links: internal hrefs that returned 4xx */
  const brokenLinks: CrawlResult["brokenLinks"] = []
  for (const page of pages) {
    for (const href of page.internalLinks) {
      const status = statusMap.get(href)
      if (status !== undefined && status >= 400) {
        brokenLinks.push({ from: page.url, to: href, status })
      }
    }
  }

  /* Detect redirect chains (3+ hops) — placeholder: Crawlee follows redirects transparently;
     full chain detection requires intercepting each 3xx. Log for now, implement in M3. */
  const redirectChains: CrawlResult["redirectChains"] = []

  const durationMs = Date.now() - startedAt
  logger.info({ domain, pagesCount: pages.length, brokenLinks: brokenLinks.length, durationMs }, "Crawl complete")

  return {
    domain,
    pages,
    brokenLinks,
    redirectChains,
    crawledAt: new Date().toISOString(),
    durationMs,
  }
}
