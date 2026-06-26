# Changelog

All notable changes to RankIQ will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-06-26

First release. Full-stack SEO SaaS — all six milestones complete.

### Added

**M1 — Auth + Billing**
- Google OAuth sign-in via Auth.js v5 with DrizzleAdapter
- Stripe checkout (Starter / Growth / Agency tiers) + webhook handler (`customer.subscription.*`)
- Boot guard: refuses to start if any secret matches a known placeholder pattern
- CI pipeline (GitHub Actions): lint, tsc, tests, secret-scan, `npm audit`
- Dependabot configured for weekly dependency updates

**M2 — Site Crawler + Technical SEO**
- Crawlee `CheerioCrawler`-based crawler; two-pass incoming-link counting
- 15 SEO issue detectors across critical / warning / info severity
- Health score 0–100 formula (penalty = weight × min(affectedCount, 5))
- Drizzle ORM schema: `sites`, `audits`, `audit_issues`, `audit_page_analyses`
- BullMQ `crawl` queue + worker; job idempotency via `jobId`

**M3 — On-Page SEO Analysis**
- Per-URL `onPageScore` 0–100 (deductions: missing title −20, missing H1 −15, noindex −30, floor 0)
- `buildPageAnalyses()` — stores JSONB per-page analyses on audit record
- `GET /api/v1/audits/:id/pages` — paginated per-URL analysis endpoint

**M4 — AI Action Plan**
- Claude Haiku action plan generation via `LLMProvider` adapter
- YAML prompt in `prompts/action-plan-v1.yaml` — version-controlled, never inline
- OWASP LLM01 prompt-injection defence: `sanitizeUrl()` strips URLs to path-only (≤80 chars); `fillTemplate` uses `\{\{(\w+)\}\}` regex (no spaces/colons in token names)
- Revenue-impact ranking with dedup fallback; fixInstructions capped at 400 chars
- `GET /api/v1/audits/:id/action-plan` — sorted by `revenueImpactRank` asc
- Action Plan UI: teal rank badges, severity tags, "How to fix" cards

**M5 — Google Search Console + Progress Tracking**
- GSC OAuth2 integration: `buildAuthUrl` / `exchangeCode` / `refreshAccessToken` / `fetchTopKeywords`
- State param CSRF protection: `base64url(JSON({siteId, userId}))`; callback verifies `parsed.userId === session.user.id`
- `gsc_keyword_metrics` table: keyword, clicks, impressions, positionAvg (1–100, lower=better), ctrPct (0–100)
- `PATCH /api/v1/issues/:id/fix` — toggles fixed state; traverses issue→audit→site→userId chain
- `GET /api/v1/sites/:id/health-history` — sparkline data for progress tracking
- Site detail page: SVG health sparkline, GSC keyword table, connect/disconnect panel

**M6 — Email Reports + Polish**
- `sendAuditReportEmail()` via Resend raw fetch; `welcomeEmail()` on signup
- XSS prevention: `escHtml()` escapes `& < > "` in all user-controlled strings before HTML insertion
- `POST /api/v1/audits/:id/report` — manually trigger email; 409 if audit not complete
- BullMQ email queue; 30s delay after audit completion so action plan can finish
- `robots.txt` blocks `/dashboard`, `/api/`, `/sites/`, `/audits/`
- `sitemap.ts` exposes `/`, `/pricing`, `/login`
- Dashboard: site health color-coding (≥80 teal, ≥60 amber, <60 red), GSC connected badge

### Testing (163 tests, 11 files)
- Unit: analyzer (37), validators (20), email (16), GSC (11), action-plan security (14), config (3), utils (7), regressions (10)
- Adversarial: tenant isolation (19) — Alice/Bob cross-tenant, IDOR, unauthenticated session
- Golden: action plan payload + LLM response parser (15)
- Eval: quality metrics M1–M5 (11) — issue detection 100%/100% precision/recall, health score calibration, AI payload quality 7/7, rubric avg 5.2/6

### Security
- All 20 API routes require `auth()` call before data access
- Tenant isolation seam: `getSiteById(id, userId)` is the single chokepoint
- Stripe webhook: signature verified via `constructWebhookEvent` before body is read
- GSC OAuth: CSRF state param; userId cross-check in callback
- Boot guard: rejects placeholder secrets in non-test environments
- Secret scan in pre-commit + CI

### Known gaps (integration sprint)
- Health score calibration: formula collapses too quickly at the bottom of the scale (filed for log-damped fix)
- AI instruction revenue connection: 1/5 golden instructions mention business impact (prompt improvement needed)
- 7 live-path gates blocked pending integration sprint (LLM quality, crawler E2E, GSC, Stripe, email delivery, auth, 10-min onboarding)
