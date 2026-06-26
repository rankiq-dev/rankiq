import { config } from "@/config"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GSC_API_BASE    = "https://www.googleapis.com/webmasters/v3"

/* Scope required for Search Console read access */
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"

export interface GscTokens {
  accessToken:  string
  refreshToken: string
  expiresAt:    number /* unix ms */
}

export interface GscRow {
  keyword:    string
  clicks:     number
  impressions: number
  position:   number /* 1.00–100.00, lower = better */
  ctr:        number /* 0–1, multiply × 100 for percentage */
}

/** Build the Google OAuth2 authorization URL with the GSC scope. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     config.googleClientId,
    redirect_uri:  `${config.appUrl}/api/v1/gsc/callback`,
    response_type: "code",
    scope:         GSC_SCOPE,
    access_type:   "offline",
    prompt:        "consent",
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/** Exchange authorization code for tokens. */
export async function exchangeCode(code: string): Promise<GscTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri:  `${config.appUrl}/api/v1/gsc/callback`,
      grant_type:    "authorization_code",
    }).toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC token exchange failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as {
    access_token: string; refresh_token?: string; expires_in: number
  }
  if (!json.refresh_token) {
    throw new Error("GSC token exchange: no refresh_token returned. Ensure access_type=offline and prompt=consent.")
  }
  return {
    accessToken:  json.access_token,
    refreshToken: json.refresh_token,
    expiresAt:    Date.now() + json.expires_in * 1000,
  }
}

/** Refresh an expired access token using a stored refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     config.googleClientId,
      client_secret: config.googleClientSecret,
      grant_type:    "refresh_token",
    }).toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC token refresh failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  return { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
}

/** Fetch top keywords from Search Console for a domain. */
export async function fetchTopKeywords(opts: {
  domain: string
  accessToken: string
  startDate: string /* YYYY-MM-DD */
  endDate:   string /* YYYY-MM-DD */
  rowLimit?: number
}): Promise<GscRow[]> {
  /* GSC accepts sc-domain:example.com (domain property) or https://example.com/ (URL prefix) */
  const siteUrl = `sc-domain:${opts.domain}`
  const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate:   opts.endDate,
      dimensions: ["query"],
      rowLimit:   opts.rowLimit ?? 500,
      dataState:  "all",
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC searchAnalytics query failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as {
    rows?: Array<{ keys: string[]; clicks: number; impressions: number; position: number; ctr: number }>
  }

  return (json.rows ?? []).map((r) => ({
    keyword:    r.keys[0] ?? "",
    clicks:     r.clicks,
    impressions: r.impressions,
    position:   r.position,
    ctr:        r.ctr,
  }))
}
