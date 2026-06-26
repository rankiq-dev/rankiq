/** Raw data extracted per page by the crawler */
export interface CrawledPage {
  url: string
  status: number            /* HTTP status code */
  title: string | null
  metaDescription: string | null
  metaRobots: string | null /* content of <meta name="robots"> */
  canonical: string | null
  h1Count: number
  h1Text: string | null     /* first H1 text */
  h2Count: number
  h3Count: number
  internalLinks: string[]   /* same-domain href values, absolute */
  externalLinks: string[]
  wordCount: number
  redirectedFrom: string | null /* original URL if this page was a redirect target */
  /* M3 on-page signals */
  imageCount: number
  imagesMissingAlt: number  /* count of <img> tags without alt attribute or with empty alt */
  hasJsonLd: boolean        /* page has <script type="application/ld+json"> */
  incomingInternalLinks: number /* populated in second pass after full crawl */
}

export interface CrawlResult {
  domain: string
  pages: CrawledPage[]
  brokenLinks: { from: string; to: string; status: number }[]
  /* redirectChains: sequences of 3+ redirects */
  redirectChains: { chain: string[]; finalUrl: string }[]
  crawledAt: string         /* ISO 8601 UTC */
  durationMs: number
}

/**
 * Per-URL on-page analysis result.
 * Stored as JSONB in audits.page_analyses — one entry per crawled page.
 * onPageScore: integer 0–100 (higher = better on-page optimisation).
 */
export interface PageAnalysis {
  url: string
  onPageScore: number
  title: string | null
  titleLength: number
  metaDescription: string | null
  metaDescriptionLength: number
  h1Text: string | null
  h1Count: number
  h2Count: number
  h3Count: number
  wordCount: number
  internalLinkCount: number
  incomingInternalLinks: number
  imageCount: number
  imagesMissingAlt: number
  hasCanonical: boolean
  hasJsonLd: boolean
  isNoindex: boolean
  /* slugs of issue types that affect this specific URL */
  issueTypes: string[]
}
