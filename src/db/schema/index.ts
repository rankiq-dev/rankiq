import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
  numeric,
  date,
} from "drizzle-orm/pg-core"

/* ── Enums ───────────────────────────────────────────────────────────────── */
export const planEnum = pgEnum("plan", ["starter", "growth", "agency"])

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
])

export const auditStatusEnum = pgEnum("audit_status", [
  "queued",
  "running",
  "complete",
  "failed",
])

export const issueSeverityEnum = pgEnum("issue_severity", [
  "critical",
  "warning",
  "info",
])

export const issueCategoryEnum = pgEnum("issue_category", [
  "technical",
  "on_page",
  "off_page",
  "local",
  "ecommerce",
  "content",
])

/* ── Auth.js required tables ─────────────────────────────────────────────── */
export const users = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name"),
  /* PII — required for auth, retained while account active */
  email:         text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  /* PII — profile photo URL from OAuth provider */
  image:         text("image"),

  /* Subscription — tenant isolation key on every child entity */
  plan:                   planEnum("plan").default("starter").notNull(),
  subscriptionStatus:     subscriptionStatusEnum("subscription_status"),
  stripeCustomerId:       text("stripe_customer_id").unique(),
  stripeSubscriptionId:   text("stripe_subscription_id").unique(),
  /* Idempotency: Stripe webhook events deduped by stripeSubscriptionId */
  stripePriceId:          text("stripe_price_id"),
  /* Unix epoch seconds — mirrors Stripe's representation to avoid TZ drift */
  stripeCurrentPeriodEnd: integer("stripe_current_period_end_unix"),

  /* Notification preferences */
  notifyAuditComplete:  boolean("notify_audit_complete").default(true).notNull(),
  notifyWeeklyDigest:   boolean("notify_weekly_digest").default(true).notNull(),
  notifyCriticalOnly:   boolean("notify_critical_only").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const accounts = pgTable(
  "accounts",
  {
    userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:              text("type").notNull(),
    provider:          text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    /* Sensitive — OAuth tokens; redacted in logs */
    refreshToken:  text("refresh_token"),
    accessToken:   text("access_token"),
    expiresAt:     integer("expires_at"),
    tokenType:     text("token_type"),
    scope:         text("scope"),
    idToken:       text("id_token"),
    sessionState:  text("session_state"),
  },
  (t) => [uniqueIndex("accounts_provider_idx").on(t.provider, t.providerAccountId)]
)

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { withTimezone: true }).notNull(),
})

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token:      text("token").notNull(),
  expires:    timestamp("expires", { withTimezone: true }).notNull(),
})

/* ── Sites ───────────────────────────────────────────────────────────────── */
export const sites = pgTable(
  "sites",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    /* Tenant key — all child records (audits, issues) isolate through this */
    userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /* Canonical domain, no protocol, no trailing slash e.g. "example.com" */
    domain:      text("domain").notNull(),
    displayName: text("display_name"),
    gscConnected:    boolean("gsc_connected").default(false).notNull(),
    /* Sensitive — GSC OAuth refresh token; redacted in logs */
    gscRefreshToken: text("gsc_refresh_token"),
    /* Client label for agency users — e.g. "Client: Acme Corp" */
    clientLabel:    text("client_label"),
    /* Audit schedule: "off" | "weekly" | "biweekly" | "monthly" */
    auditSchedule:  text("audit_schedule").default("weekly").notNull(),
    /* Max pages to crawl per audit */
    maxPages:       integer("max_pages").default(200).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sites_user_idx").on(t.userId),
    uniqueIndex("sites_user_domain_idx").on(t.userId, t.domain),
  ]
)

/* ── Audits ──────────────────────────────────────────────────────────────── */
export const audits = pgTable(
  "audits",
  {
    id:     uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    status: auditStatusEnum("status").default("queued").notNull(),
    /* pagesCount: count of pages successfully crawled (integer, ≥ 0) */
    pagesCount:   integer("pages_count").default(0),
    /* healthScore: 0–100 integer, higher = healthier. Null until audit complete. */
    healthScore:  integer("health_score"),
    errorMessage: text("error_message"),
    /* pageAnalyses: per-URL on-page scores stored alongside audit; null until complete */
    pageAnalyses: jsonb("page_analyses").$type<import("@/domain/audit/types").PageAnalysis[]>(),
    startedAt:    timestamp("started_at",   { withTimezone: true }),
    completedAt:  timestamp("completed_at", { withTimezone: true }),
    /* Public share token — set to generate a shareable read-only URL */
    shareToken:   text("share_token").unique(),
    createdAt:    timestamp("created_at",   { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audits_site_idx").on(t.siteId),
    index("audits_status_idx").on(t.status),
  ]
)

/* ── Audit Issues ────────────────────────────────────────────────────────── */
export const auditIssues = pgTable(
  "audit_issues",
  {
    id:      uuid("id").primaryKey().defaultRandom(),
    auditId: uuid("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
    severity: issueSeverityEnum("severity").notNull(),
    category: issueCategoryEnum("category").notNull(),
    /* type: machine-readable slug e.g. "missing_title_tag", "broken_internal_link" */
    type:        text("type").notNull(),
    title:       text("title").notNull(),
    description: text("description").notNull(),
    /* affectedUrls: up to 50 sample URLs stored; full list reconstructed from crawler output */
    affectedUrls:  jsonb("affected_urls").$type<string[]>().default([]),
    /* affectedCount: total page count with this issue (integer, ≥ 0) */
    affectedCount: integer("affected_count").default(0).notNull(),
    /* AI-generated fields — null until action plan step runs */
    fixInstructions:   text("fix_instructions"),
    /* revenueImpactRank: 1 = highest estimated revenue impact, N = lowest.
       Rank is per-audit (not global); two issues in same audit never share a rank. */
    revenueImpactRank: integer("revenue_impact_rank"),
    isFixed:  boolean("is_fixed").default(false).notNull(),
    fixedAt:  timestamp("fixed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_issues_audit_idx").on(t.auditId),
    index("audit_issues_severity_idx").on(t.auditId, t.severity),
    index("audit_issues_rank_idx").on(t.auditId, t.revenueImpactRank),
  ]
)

/* ── GSC Keyword Metrics ─────────────────────────────────────────────────── */
export const gscKeywordMetrics = pgTable(
  "gsc_keyword_metrics",
  {
    id:     uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    clicks:      integer("clicks").default(0).notNull(),
    impressions: integer("impressions").default(0).notNull(),
    /* positionAvg: 1.00–100.00, lower = better (rank #1 = 1.00) */
    positionAvg: numeric("position_avg", { precision: 5, scale: 2 }).notNull(),
    /* ctrPct: click-through rate as percentage 0.00–100.00 (NOT 0–1) */
    ctrPct: numeric("ctr_pct", { precision: 5, scale: 2 }).notNull(),
    dateRangeStart: date("date_range_start").notNull(),
    dateRangeEnd:   date("date_range_end").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("gsc_metrics_site_idx").on(t.siteId),
    index("gsc_metrics_site_date_idx").on(t.siteId, t.dateRangeStart),
  ]
)

/* ── API Keys ────────────────────────────────────────────────────────────── */
export const apiKeys = pgTable(
  "api_keys",
  {
    id:     uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name:   text("name").notNull(),
    /* keyHash: SHA-256 of the actual key; never store plaintext */
    keyHash: text("key_hash").notNull().unique(),
    /* keyPrefix: first 8 chars of the plaintext key shown in UI for identification */
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt:  timestamp("expires_at",   { withTimezone: true }),
    createdAt:  timestamp("created_at",   { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("api_keys_user_idx").on(t.userId)]
)

/* ── Inferred types (schema ↔ code contract) ─────────────────────────────── */
export type User               = typeof users.$inferSelect
export type NewUser            = typeof users.$inferInsert
export type Site               = typeof sites.$inferSelect
export type NewSite            = typeof sites.$inferInsert
export type Audit              = typeof audits.$inferSelect
export type NewAudit           = typeof audits.$inferInsert
export type AuditIssue         = typeof auditIssues.$inferSelect
export type NewAuditIssue      = typeof auditIssues.$inferInsert
export type GscKeywordMetric    = typeof gscKeywordMetrics.$inferSelect
export type NewGscKeywordMetric = typeof gscKeywordMetrics.$inferInsert
export type ApiKey              = typeof apiKeys.$inferSelect
export type NewApiKey           = typeof apiKeys.$inferInsert
