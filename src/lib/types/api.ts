/* ═══════════════════════════════════════════════════════════════════
   RankIQ API Contracts v1
   All routes are prefixed /api/v1/
   Versioning strategy: additive-only on v1; breaking changes → /api/v2/
   All timestamps: ISO 8601 UTC string
   All IDs: UUID v4 string
═══════════════════════════════════════════════════════════════════ */

/* ── Shared envelope ──────────────────────────────────────────────── */
export interface ApiSuccess<T> {
  data: T
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

/* ── Sites ────────────────────────────────────────────────────────── */

export interface SiteDto {
  id: string
  domain: string                  /* canonical hostname, no protocol */
  displayName: string | null
  gscConnected: boolean
  createdAt: string               /* ISO 8601 UTC */
  updatedAt: string
}

/* POST /api/v1/sites */
export interface CreateSiteRequest {
  domain: string
  displayName?: string
}
export type CreateSiteResponse = ApiSuccess<{ site: SiteDto }>

/* GET /api/v1/sites */
export type ListSitesResponse = ApiSuccess<{ sites: SiteDto[] }>

/* DELETE /api/v1/sites/:id */
export type DeleteSiteResponse = ApiSuccess<{ deleted: true }>

/* ── Audits ───────────────────────────────────────────────────────── */

export interface AuditDto {
  id: string
  siteId: string
  status: "queued" | "running" | "complete" | "failed"
  /* healthScore: integer 0–100. Null while audit is running. */
  healthScore: number | null
  pagesCount: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface AuditSummaryDto extends AuditDto {
  criticalCount: number
  warningCount: number
  infoCount: number
}

/* POST /api/v1/audits — triggers a new crawl */
export interface TriggerAuditRequest { siteId: string }
export type TriggerAuditResponse = ApiSuccess<{ auditId: string; status: "queued" }>

/* GET /api/v1/audits/:id */
export type GetAuditResponse = ApiSuccess<{ audit: AuditSummaryDto }>

/* ── Audit Issues ─────────────────────────────────────────────────── */

export interface AuditIssueDto {
  id: string
  auditId: string
  severity: "critical" | "warning" | "info"
  category: "technical" | "on_page" | "off_page" | "local" | "ecommerce" | "content"
  type: string                    /* machine slug e.g. "missing_title_tag" */
  title: string
  description: string
  affectedUrls: string[]          /* up to 50 sample URLs */
  /* affectedCount: total pages with this issue (integer ≥ 0) */
  affectedCount: number
  fixInstructions: string | null  /* AI-generated; null until action plan runs */
  /* revenueImpactRank: 1 = highest estimated revenue impact (per-audit rank) */
  revenueImpactRank: number | null
  isFixed: boolean
  fixedAt: string | null
}

/* GET /api/v1/audits/:id/issues?severity=critical&limit=50&offset=0 */
export interface ListIssuesQuery {
  severity?: "critical" | "warning" | "info"
  limit?: number
  offset?: number
}
export type ListIssuesResponse = ApiSuccess<{
  issues: AuditIssueDto[]
  total: number
  limit: number
  offset: number
}>

/* POST /api/v1/issues/:id/fix */
export type MarkIssueFixedResponse = ApiSuccess<{ issue: AuditIssueDto }>

/* ── Account / Billing ────────────────────────────────────────────── */

export interface AccountDto {
  id: string
  email: string
  name: string | null
  plan: "starter" | "growth" | "agency"
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | null
  /* stripeCurrentPeriodEnd: Unix epoch seconds, or null if no subscription */
  stripeCurrentPeriodEnd: number | null
}

/* GET /api/v1/account */
export type GetAccountResponse = ApiSuccess<{ account: AccountDto }>

/* ── Health ───────────────────────────────────────────────────────── */

export interface HealthDto {
  status: "ok"
  service: string
  env: string
  timestamp: string               /* ISO 8601 UTC */
  configLoaded: boolean
}

/* GET /api/health (unversioned — infra endpoint) */
export type HealthResponse = HealthDto

/* ── Stripe Webhook ───────────────────────────────────────────────── */

/* POST /api/webhooks/stripe
   Idempotency key: stripe event.id (deduped by Stripe; we log + skip duplicates)
   Signature verification: stripe-signature header checked before any processing */
export interface StripeWebhookMeta {
  eventId: string                 /* Stripe event.id — idempotency key */
  eventType: string
}
