import {
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  fetchTopKeywords,
} from "@/providers/search-console"
import { updateSite, getSiteById } from "@/db/repositories/sites"
import {
  bulkInsertKeywordMetrics,
  deleteKeywordMetricsBySite,
} from "@/db/repositories/gsc"
import type { NewGscKeywordMetric } from "@/db/schema"

/* 28-day window — what Search Console exposes by default */
const DAYS_BACK = 28

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dateRange(): { startDate: string; endDate: string } {
  const end   = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - DAYS_BACK)
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

/** Returns the OAuth2 URL the user should be redirected to. State encodes siteId. */
export function getGscAuthUrl(siteId: string, userId: string): string {
  const state = Buffer.from(JSON.stringify({ siteId, userId })).toString("base64url")
  return buildAuthUrl(state)
}

/** Parses the state param from the OAuth callback. Returns null on tampered/bad state. */
export function parseGscState(state: string): { siteId: string; userId: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
    if (typeof parsed.siteId !== "string" || typeof parsed.userId !== "string") return null
    return parsed as { siteId: string; userId: string }
  } catch {
    return null
  }
}

/**
 * Handle the GSC OAuth callback. Exchanges the code, stores the refresh token on the site,
 * then immediately triggers a data import.
 */
export async function connectGsc(opts: {
  code: string
  siteId: string
  userId: string
}): Promise<void> {
  const site = await getSiteById(opts.siteId, opts.userId)
  if (!site) throw Object.assign(new Error("Site not found"), { code: "NOT_FOUND" })

  const tokens = await exchangeCode(opts.code)

  await updateSite(opts.siteId, opts.userId, {
    gscConnected: true,
    gscRefreshToken: tokens.refreshToken,
  })

  await importGscData({ siteId: opts.siteId, userId: opts.userId, accessToken: tokens.accessToken, domain: site.domain })
}

/** Disconnect GSC — removes tokens and clears keyword data. */
export async function disconnectGsc(siteId: string, userId: string): Promise<void> {
  await Promise.all([
    updateSite(siteId, userId, { gscConnected: false, gscRefreshToken: null }),
    deleteKeywordMetricsBySite(siteId),
  ])
}

/**
 * Re-import GSC keyword data for a connected site.
 * Refreshes the access token if needed, then fetches and replaces keyword rows.
 */
export async function refreshGscData(siteId: string, userId: string): Promise<void> {
  const site = await getSiteById(siteId, userId)
  if (!site) throw Object.assign(new Error("Site not found"), { code: "NOT_FOUND" })
  if (!site.gscConnected || !site.gscRefreshToken) {
    throw Object.assign(new Error("GSC not connected for this site"), { code: "GSC_NOT_CONNECTED" })
  }

  const { accessToken } = await refreshAccessToken(site.gscRefreshToken)
  await importGscData({ siteId, userId, accessToken, domain: site.domain })
}

async function importGscData(opts: {
  siteId: string
  userId: string
  accessToken: string
  domain: string
}): Promise<void> {
  const { startDate, endDate } = dateRange()

  const rows = await fetchTopKeywords({
    domain:      opts.domain,
    accessToken: opts.accessToken,
    startDate,
    endDate,
    rowLimit:    500,
  })

  /* Replace existing data for this site with the fresh import */
  await deleteKeywordMetricsBySite(opts.siteId)

  const records: NewGscKeywordMetric[] = rows.map((r) => ({
    siteId:        opts.siteId,
    keyword:       r.keyword,
    clicks:        r.clicks,
    impressions:   r.impressions,
    positionAvg:   r.position.toFixed(2),
    ctrPct:        (r.ctr * 100).toFixed(2),
    dateRangeStart: startDate,
    dateRangeEnd:   endDate,
  }))

  await bulkInsertKeywordMetrics(records)
}
