# M5 — Google Search Console Integration + Progress Tracking

## What
Users connect their Google Search Console account to a site. RankIQ imports 28 days of keyword ranking data (clicks, impressions, average position, CTR) and shows it alongside the SEO audit. Users can mark individual issues as fixed (with a toggle), and the Site Overview page displays health score history across all completed audits as a sparkline chart.

## Definition of Done (incl. security)

| Criterion | Status |
|---|---|
| GSC OAuth2 flow — custom authorization URL with `webmasters.readonly` scope | ✅ |
| OAuth state param encodes siteId + userId as base64url JSON (not plain text) | ✅ |
| **Tenant isolation: callback verifies `state.userId === session.userId` before acting** | ✅ |
| `gsc_keyword_metrics` table + migration `0002_boring_martin_li.sql` | ✅ |
| Import: 500 top keywords per sync, stored as replace-not-append | ✅ |
| `ctrPct` stored as 0.00–100.00 (Google returns 0–1; multiplied × 100 at ingest) | ✅ |
| `positionAvg` stored as 1.00–100.00, 2 decimal places | ✅ |
| `GET /api/v1/sites/:id/gsc` — status + keywords (tenant-isolated) | ✅ |
| `POST /api/v1/sites/:id/gsc` — refresh keyword data | ✅ |
| `DELETE /api/v1/sites/:id/gsc` — disconnect + clear data | ✅ |
| `GET /api/v1/gsc/callback` — OAuth2 callback, exchanges code, stores refresh token | ✅ |
| `PATCH /api/v1/issues/:id/fix` — toggle isFixed (true/false), tenant-isolated | ✅ |
| `GET /api/v1/sites/:id/health-history` — completed audits sorted by date | ✅ |
| Site detail page: health sparkline, GSC connect/disconnect panel, keyword table | ✅ |
| **No secret tokens hardcoded; refresh tokens stored server-side only (never in response)** | ✅ |
| `tsc --noEmit` clean | ✅ |
| 35/35 tests pass (11 new GSC unit tests) | ✅ |

## Security

### OAuth state CSRF protection
The state param is `base64url(JSON({ siteId, userId }))`. The callback route reads `session.userId` from the Auth.js session (server-side) and compares it to `state.userId`. A CSRF attacker who tricks a victim into visiting the callback URL cannot win because:
- The attacker's `state.userId` won't match the victim's authenticated session.
- The attacker doesn't know the victim's userId.

### Refresh token storage
GSC refresh tokens are stored in the `sites.gsc_refresh_token` column. They are:
- Never returned in any API response (the `SiteDto` omits it)
- Redacted in structured logs (column comment marks it sensitive)
- Cleared on `DELETE /api/v1/sites/:id/gsc` (disconnect)

### Tenant isolation
Every GSC route reads the site via `getSiteById(id, session.userId)` before acting. A user cannot read/modify another user's GSC tokens or keyword data.

## Units / scale contract

| Field | Scale | Source |
|---|---|---|
| `positionAvg` | 1.00–100.00, lower = better | Google API `position` (same scale) |
| `ctrPct` | 0.00–100.00 percentage | Google API `ctr` (0–1) × 100 |
| `clicks` | integer count | Google API `clicks` (integer) |
| `impressions` | integer count | Google API `impressions` (integer) |
| Date range | YYYY-MM-DD ISO string | Computed: today − 28 days to today |

## Architecture

```
User clicks "Connect GSC"
     ↓
GET /api/v1/sites/:id/gsc → authUrl  (state = base64url{siteId, userId})
     ↓
Redirect → accounts.google.com/o/oauth2/v2/auth
     ↓ (user approves)
GET /api/v1/gsc/callback?code=...&state=...
  ├─ auth() — verify session
  ├─ parseGscState(state) — decode + validate
  ├─ state.userId === session.userId → tenant check
  ├─ exchangeCode(code) → { accessToken, refreshToken }
  ├─ updateSite → gscConnected=true, gscRefreshToken=refreshToken
  └─ importGscData() → fetch 500 keywords → deleteOld + bulkInsert
     ↓
Redirect to /sites/:id?gsc=connected
```

## Progress Tracking

### Mark issue as fixed
`PATCH /api/v1/issues/:id/fix` with body `{ fixed: true }` (or `false` to unmark).
- Tenant isolation: issue → auditId → siteId → verified against session.userId
- `fixedAt` timestamp set on mark; cleared on unmark
- Health score is recalculated on next full re-crawl (not real-time)

### Health score history
`GET /api/v1/sites/:id/health-history` returns all completed audits with `healthScore` and `completedAt`, sorted ascending. The site detail page renders these as an SVG sparkline.

## Code Locations

| File | Purpose |
|---|---|
| [`src/db/schema/index.ts`](../../src/db/schema/index.ts) | `gscKeywordMetrics` table added |
| [`src/db/migrations/0002_boring_martin_li.sql`](../../src/db/migrations/0002_boring_martin_li.sql) | Auto-generated migration |
| [`src/db/repositories/gsc.ts`](../../src/db/repositories/gsc.ts) | Keyword metrics DB queries |
| [`src/providers/search-console/index.ts`](../../src/providers/search-console/index.ts) | Google OAuth2 + GSC API adapter |
| [`src/domain/sites/gsc.ts`](../../src/domain/sites/gsc.ts) | `connectGsc`, `disconnectGsc`, `refreshGscData`, `parseGscState` |
| [`src/app/api/v1/gsc/callback/route.ts`](../../src/app/api/v1/gsc/callback/route.ts) | OAuth2 callback handler |
| [`src/app/api/v1/sites/[id]/gsc/route.ts`](../../src/app/api/v1/sites/[id]/gsc/route.ts) | GET status/keywords · POST refresh · DELETE disconnect |
| [`src/app/api/v1/issues/[id]/fix/route.ts`](../../src/app/api/v1/issues/[id]/fix/route.ts) | PATCH mark/unmark issue as fixed |
| [`src/app/api/v1/sites/[id]/health-history/route.ts`](../../src/app/api/v1/sites/[id]/health-history/route.ts) | GET health score history |
| [`src/app/(dashboard)/sites/[id]/page.tsx`](../../src/app/(dashboard)/sites/[id]/page.tsx) | Site detail — sparkline, GSC panel, keyword table |
| [`tests/unit/gsc.test.ts`](../../tests/unit/gsc.test.ts) | 11 unit tests — state encoding, unit conversions, tenant isolation |

## How Verified
- `tsc --noEmit` — 0 errors
- `npm test` — 35/35 pass (11 new GSC tests)
- State tamper: `parseGscState("not-valid-base64!!!")` → `null` ✓
- State tenant mismatch: `parsed.userId !== sessionUserId` → blocked ✓
- CTR unit: `0.0345 × 100 = 3.45%` stored correctly ✓
- Position unit: Google's `3.5` → stored as `"3.50"` ✓
- OAuth round-trip: siteId/userId survive base64url encode/decode ✓
