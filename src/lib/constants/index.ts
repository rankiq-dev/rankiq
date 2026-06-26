export const PLAN_LIMITS = {
  starter: { sites: 1,  pagesPerCrawl: 100, auditsPerMonth: 4  },
  growth:  { sites: 5,  pagesPerCrawl: 500, auditsPerMonth: 20 },
  agency:  { sites: 25, pagesPerCrawl: 5000,auditsPerMonth: 100},
} as const

export const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const

export const ISSUE_CATEGORIES = [
  "technical",
  "on_page",
  "off_page",
  "local",
  "ecommerce",
  "content",
] as const

export const MAX_ACTION_PLAN_ISSUES = 20
export const CRAWL_TIMEOUT_MS = 10 * 60 * 1000
export const LLM_TIMEOUT_MS   = 30 * 1000
export const HEALTH_SCORE_MAX = 100
