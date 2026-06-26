# M2 — Site Crawler + Technical SEO Audit

## What
Users add their domain; RankIQ crawls it via Crawlee (CheerioCrawler), extracts 10+ technical/on-page SEO signals per page, runs an analyzer to produce typed `AuditIssue` records ranked by severity, and stores a health score 0–100. The entire crawl runs as a BullMQ background job off the HTTP event loop.

## Definition of Done (incl. security)

| Criterion | Status |
|---|---|
| `POST /api/v1/sites` creates site with plan-limit enforcement | ✅ |
| `GET /api/v1/sites` lists user's sites | ✅ |
| `DELETE /api/v1/sites/:id` deletes site with ownership check | ✅ |
| `POST /api/v1/audits` enqueues crawl job, returns `{ auditId, status: "queued" }` | ✅ |
| `GET /api/v1/audits/:id` returns status + health score + issue counts | ✅ |
| `GET /api/v1/audits/:id/issues` lists issues with severity filter + pagination | ✅ |
| BullMQ worker runs real CheerioCrawler (not a stub) | ✅ |
| Analyzer detects ≥10 issue types across critical/warning/info | ✅ |
| Health score computed 0–100 from issue severity + count | ✅ |
| `/sites/new` page lets user add domain + triggers first audit | ✅ |
| **Security: userId always from session, never from request body** | ✅ |
| **Security: Tenant isolation — audit ownership verified via site→userId chain** | ✅ |
| **Security: Domain validated + sanitized by Zod (strips www., lowercases)** | ✅ |
| **Security: Crawler bounded by PLAN_LIMITS[plan].pagesPerCrawl** | ✅ |
| **Security: Crawl timeout enforced (CRAWL_TIMEOUT_MS)** | ✅ |
| **Security: BullMQ job has idempotency key `crawl-{auditId}`** | ✅ |
| `tsc --noEmit` clean | ✅ |
| 10/10 tests pass | ✅ |

## Issue Types Detected

| Issue | Severity | Category |
|---|---|---|
| `missing_title_tag` | critical | on_page |
| `missing_h1` | critical | on_page |
| `broken_internal_link` | critical | technical |
| `robots_noindex` | critical | technical |
| `missing_meta_description` | warning | on_page |
| `title_too_long` (>60 chars) | warning | on_page |
| `title_too_short` (<20 chars) | warning | on_page |
| `multiple_h1_tags` | warning | on_page |
| `no_canonical_tag` | warning | technical |
| `redirect_chain` | warning | technical |
| `meta_description_too_long` (>160 chars) | info | on_page |
| `thin_content` (<300 words) | info | content |

## Health Score Formula

```
score = max(0, min(100, 100 − Σ penalty))

critical issue: 10 pts × min(affectedCount, 5)
warning issue:   4 pts × min(affectedCount, 5)
info issue:      1 pt  × min(affectedCount, 5)
```

## Architecture

```
User → POST /api/v1/sites       → domain validated → DB insert
User → POST /api/v1/audits      → audit record created (status=queued) → BullMQ enqueue
                                                                            ↓
Worker (Railway) ────────────── picks job → status=running
                                           → crawlSite() [CheerioCrawler]
                                           → analyzePages() → []NewAuditIssue
                                           → bulkInsertIssues()
                                           → updateAuditStatus(complete, healthScore)
User → GET /api/v1/audits/:id   → polls status
User → GET /api/v1/audits/:id/issues → reads typed issue list
```

## Code Locations

| File | Purpose |
|---|---|
| [`src/domain/audit/types.ts`](../../src/domain/audit/types.ts) | `CrawledPage`, `CrawlResult` types |
| [`src/domain/audit/crawler.ts`](../../src/domain/audit/crawler.ts) | CheerioCrawler wrapper — extracts SEO signals per page |
| [`src/domain/audit/analyzer.ts`](../../src/domain/audit/analyzer.ts) | Converts `CrawlResult` → `NewAuditIssue[]`; computes health score |
| [`src/domain/audit/service.ts`](../../src/domain/audit/service.ts) | `triggerAudit()` + `processCrawlJob()` — orchestration |
| [`src/domain/sites/service.ts`](../../src/domain/sites/service.ts) | `addSite()`, `listSites()`, `removeSite()` — plan-limit enforcement |
| [`src/app/api/v1/sites/route.ts`](../../src/app/api/v1/sites/route.ts) | GET + POST sites |
| [`src/app/api/v1/sites/[id]/route.ts`](../../src/app/api/v1/sites/[id]/route.ts) | DELETE site |
| [`src/app/api/v1/audits/route.ts`](../../src/app/api/v1/audits/route.ts) | POST trigger audit |
| [`src/app/api/v1/audits/[id]/route.ts`](../../src/app/api/v1/audits/[id]/route.ts) | GET audit status |
| [`src/app/api/v1/audits/[id]/issues/route.ts`](../../src/app/api/v1/audits/[id]/issues/route.ts) | GET issues list |
| [`src/app/(dashboard)/sites/new/page.tsx`](../../src/app/(dashboard)/sites/new/page.tsx) | Add site form + triggers first audit |
| [`src/jobs/worker.ts`](../../src/jobs/worker.ts) | BullMQ worker — now wired to `processCrawlJob()` |

## How Verified
- `npx tsc --noEmit` — 0 errors
- `npm test` — 10/10 pass
- Tenant isolation: `getAuditById(id)` followed by `getSiteById(audit.siteId, session.user.id)` — second call returns null if site doesn't belong to user, returns 404
- Domain sanitization: Zod `.transform()` lowercases + strips `www.` before DB insert
- Crawler bounded: `maxRequestsPerCrawl: opts.maxPages` from `PLAN_LIMITS[user.plan].pagesPerCrawl`
- Job idempotency: `{ jobId: "crawl-{auditId}" }` — BullMQ deduplicates by jobId

## To Exercise M2 (needs live env)
1. Add site via `/sites/new` → audit auto-queued
2. Start worker: `npm run worker`
3. Poll `GET /api/v1/audits/:id` until `status === "complete"`
4. Fetch `GET /api/v1/audits/:id/issues` — see typed SEO issues
5. Health score between 0–100 visible in audit response
