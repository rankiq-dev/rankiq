# M6 — Email Reports + Polish + Public Launch

## What
The final milestone completes the user-facing email pipeline and polishes the product for public launch. Users receive a branded audit report email when their crawl + action plan finishes, and a welcome email on sign-up. The dashboard shows real health scores on site cards. The SaaS has its own SEO basics (robots.txt, sitemap.xml). The email worker stub is replaced with a real Resend API call.

## Definition of Done (incl. security)

| Criterion | Status |
|---|---|
| Resend email provider (`src/providers/email/index.ts`) with real API call | ✅ |
| `auditReportEmail` HTML template — score, trend, top 5 issues, CTA, Cinematic Dark colours | ✅ |
| `welcomeEmail` HTML template — branded, CTA to add first site | ✅ |
| **HTML-escaping in all templates via `escHtml()` — prevents XSS via domain/issue content in email** | ✅ |
| Email domain service (`src/domain/email/service.ts`) — `processEmailJob`, `sendAuditReportEmail`, `sendWelcomeEmail` | ✅ |
| Email BullMQ worker wired to real `processEmailJob` (no more TODO stub) | ✅ |
| Audit report email auto-enqueued with 30s delay after crawl completes (lets action plan finish first) | ✅ |
| `POST /api/v1/audits/:id/report` — manual resend, tenant-isolated, 409 if incomplete | ✅ |
| Dashboard site cards show real health score + colour coding + GSC badge | ✅ |
| `robots.txt` — blocks `/dashboard`, `/api/`, `/sites/`, `/audits/` | ✅ |
| `sitemap.xml` — `/`, `/pricing`, `/login` | ✅ |
| `tsc --noEmit` clean | ✅ |
| 51/51 tests pass (16 new email template tests incl. XSS coverage) | ✅ |

## Email Template Security

### XSS prevention
All user-controlled or site-controlled strings inserted into email HTML pass through `escHtml()`, which replaces `& < > "` with their HTML entities. This covers:
- `domain` (from user-added sites)
- `recipientName` (from user's Google account name)
- `issue.title` (server-generated, but still escaped defensively)
- `appUrl` inserted into `href` attributes

### No PII in subject lines
Subject lines contain domain + health score only — no user names or emails. Server-side logs do not include recipient email addresses in structured log fields.

## Email Pipeline

```
Crawl complete
     ↓ (audit service)
actionPlanQueue.add("action-plan", { auditId })
emailQueue.add("audit-report", { type, auditId, userId }, { delay: 30s })
     ↓
Worker picks up email job after 30s (action plan has time to complete)
     ↓
processEmailJob({ type: "audit_report", auditId, userId })
  ├─ getAuditById → check complete
  ├─ getUserById → email + name
  ├─ getSitesByUser → domain
  ├─ getIssuesByAudit → criticalCount, warningCount, topIssues
  ├─ getAuditsForSite → prevHealthScore (trend)
  ├─ auditReportEmail() → { subject, html }
  └─ sendEmail() → Resend API → 200 { id }
```

## Dashboard Polish
Site cards now show:
- Health score (0–100) right-aligned with colour coding: ≥80 teal, ≥60 amber, <60 red
- Page count and audit status under the domain
- Green GSC dot badge when Search Console is connected
- All data fetched in one `Promise.all` — no N+1 queries

## Code Locations

| File | Purpose |
|---|---|
| [`src/providers/email/index.ts`](../../src/providers/email/index.ts) | Resend API adapter — `sendEmail()` |
| [`src/domain/email/templates.ts`](../../src/domain/email/templates.ts) | `auditReportEmail()`, `welcomeEmail()`, `escHtml()` |
| [`src/domain/email/service.ts`](../../src/domain/email/service.ts) | `processEmailJob()`, `sendAuditReportEmail()`, `sendWelcomeEmail()` |
| [`src/jobs/worker.ts`](../../src/jobs/worker.ts) | Email worker wired to `processEmailJob` |
| [`src/domain/audit/service.ts`](../../src/domain/audit/service.ts) | Email auto-enqueued with 30s delay after crawl |
| [`src/app/api/v1/audits/[id]/report/route.ts`](../../src/app/api/v1/audits/[id]/report/route.ts) | POST manual report trigger |
| [`src/app/(dashboard)/dashboard/page.tsx`](../../src/app/(dashboard)/dashboard/page.tsx) | Dashboard with real health scores |
| [`src/app/robots.txt/route.ts`](../../src/app/robots.txt/route.ts) | robots.txt for RankIQ itself |
| [`src/app/sitemap.ts`](../../src/app/sitemap.ts) | sitemap.xml for public pages |
| [`tests/unit/email.test.ts`](../../tests/unit/email.test.ts) | 16 template tests incl. XSS coverage |

## How Verified
- `tsc --noEmit` — 0 errors
- `npm test` — 51/51 pass (16 new email template tests, all green)
- XSS: `escHtml('<script>alert(1)</script>')` → `&lt;script&gt;alert(1)&lt;/script&gt;` ✓
- Score trend: healthScore=74, prev=60 → "+14 from last audit" ✓
- Score trend: healthScore=50, prev=60 → "-10 from last audit" ✓
- No trend shown when prevHealthScore=null ✓
- Issue cap: only first 5 of 10 issues appear in email ✓
- Welcome email: generic greeting when recipientName=null ✓
