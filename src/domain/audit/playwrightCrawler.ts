import { logger } from "@/infra/logger"
import type { CrawledPage, CrawlResult } from "./types"

/** Normalize a URL: strip fragment, lowercase host */
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

function isSameDomain(url: string, domain: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "")
    const d = domain.replace(/^www\./, "")
    return h === d
  } catch {
    return false
  }
}

/**
 * Playwright-based crawler for JS-rendered sites (React, Next.js, Vue, Angular, etc.)
 * Falls back to this when CheerioCrawler returns 0 pages.
 */
export async function crawlSiteWithPlaywright(domain: string, opts: { maxPages: number; timeoutMs: number }): Promise<CrawlResult> {
  const startUrl = `https://${domain}`
  const startedAt = Date.now()

  /* Dynamic import so playwright is only loaded in the worker, not Next.js edge */
  const { chromium } = await import("playwright")

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
    ],
  })

  const pages: CrawledPage[] = []
  const visited = new Set<string>()
  const queue: string[] = [startUrl]
  const statusMap = new Map<string, number>()
  const brokenLinks: CrawlResult["brokenLinks"] = []

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (compatible; RankIQ-Bot/1.0; +https://rankiq.app/bot)",
    extraHTTPHeaders: {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  })

  const overallTimeout = setTimeout(async () => {
    logger.warn({ domain }, "Playwright crawl timeout — closing browser")
    await browser.close().catch(() => null)
  }, opts.timeoutMs)

  try {
    while (queue.length > 0 && pages.length < opts.maxPages) {
      const rawUrl = queue.shift()!
      const url = normalizeUrl(rawUrl)
      if (visited.has(url)) continue
      visited.add(url)

      const page = await context.newPage()
      let status = 200

      try {
        /* Intercept responses to track status codes */
        page.on("response", (res) => {
          if (res.url() === url || res.url() === rawUrl) {
            status = res.status()
          }
        })

        const response = await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 20_000,
        })
        if (response) status = response.status()
        statusMap.set(url, status)

        if (status >= 400) {
          await page.close()
          continue
        }

        /* Wait for JS to render */
        await page.waitForTimeout(500)

        /* Extract SEO signals using DOM APIs */
        const extracted = await page.evaluate((domain: string) => {
          const title = document.title?.trim() || null
          const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content?.trim() ?? null
          const metaRobots = (document.querySelector('meta[name="robots"]') as HTMLMetaElement)?.content?.trim() ?? null
          const canonical = (document.querySelector('link[rel="canonical"]') as HTMLLinkElement)?.href?.trim() ?? null

          const h1s = document.querySelectorAll("h1")
          const h1Count = h1s.length
          const h1Text = h1s[0]?.textContent?.trim() || null
          const h2Count = document.querySelectorAll("h2").length
          const h3Count = document.querySelectorAll("h3").length

          const bodyText = document.body?.innerText ?? ""
          const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length

          let imageCount = 0
          let imagesMissingAlt = 0
          document.querySelectorAll("img").forEach((img) => {
            imageCount++
            if (!img.alt || img.alt.trim() === "") imagesMissingAlt++
          })

          const hasJsonLd = document.querySelectorAll('script[type="application/ld+json"]').length > 0

          const internalLinks: string[] = []
          const externalLinks: string[] = []
          document.querySelectorAll("a[href]").forEach((el) => {
            const href = (el as HTMLAnchorElement).href
            if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return
            try {
              const u = new URL(href)
              const h = u.hostname.replace(/^www\./, "")
              const d = domain.replace(/^www\./, "")
              if (h === d) {
                u.hash = ""
                internalLinks.push(u.toString())
              } else {
                externalLinks.push(href)
              }
            } catch { /* ignore */ }
          })

          return {
            title, metaDesc, metaRobots, canonical,
            h1Count, h1Text, h2Count, h3Count,
            wordCount, imageCount, imagesMissingAlt, hasJsonLd,
            internalLinks: [...new Set(internalLinks)],
            externalLinks: [...new Set(externalLinks)],
          }
        }, domain)

        pages.push({
          url,
          status,
          title: extracted.title,
          metaDescription: extracted.metaDesc,
          metaRobots: extracted.metaRobots,
          canonical: extracted.canonical,
          h1Count: extracted.h1Count,
          h1Text: extracted.h1Text,
          h2Count: extracted.h2Count,
          h3Count: extracted.h3Count,
          internalLinks: extracted.internalLinks,
          externalLinks: extracted.externalLinks,
          wordCount: extracted.wordCount,
          imageCount: extracted.imageCount,
          imagesMissingAlt: extracted.imagesMissingAlt,
          hasJsonLd: extracted.hasJsonLd,
          redirectedFrom: null,
          incomingInternalLinks: 0,
        })

        /* Enqueue unvisited internal links */
        for (const link of extracted.internalLinks) {
          const norm = normalizeUrl(link)
          if (!visited.has(norm) && isSameDomain(norm, domain)) {
            queue.push(norm)
          }
        }

        logger.debug({ url, title: extracted.title, h1Count: extracted.h1Count }, "Playwright page crawled")
      } catch (err) {
        logger.warn({ url, err }, "Playwright failed to load page — skipping")
        statusMap.set(url, 0)
      } finally {
        await page.close().catch(() => null)
      }
    }
  } finally {
    clearTimeout(overallTimeout)
    await browser.close().catch(() => null)
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
  logger.info({ domain, pagesCount: pages.length, durationMs, method: "playwright" }, "Playwright crawl complete")

  return {
    domain,
    pages,
    brokenLinks,
    redirectChains: [],
    crawledAt: new Date().toISOString(),
    durationMs,
  }
}
