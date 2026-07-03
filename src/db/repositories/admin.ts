import { sql, desc, eq, count, inArray } from "drizzle-orm"
import { db } from "@/db"
import { users, sites, audits, type User, type Site, type Audit } from "@/db/schema"
import { PLAN_PRICE_USD } from "@/lib/constants"

/* ── Users ───────────────────────────────────────────────────────────── */

export interface AdminUserRow {
  id: string
  name: string | null
  email: string
  image: string | null
  plan: User["plan"]
  subscriptionStatus: User["subscriptionStatus"]
  createdAt: Date
  siteCount: number
  auditCount: number
}

/** All users with site/audit counts, newest first. Admin-only — no tenant scoping. */
export async function getAllUsersForAdmin(): Promise<AdminUserRow[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      plan: users.plan,
      subscriptionStatus: users.subscriptionStatus,
      createdAt: users.createdAt,
      siteCount: sql<number>`count(distinct ${sites.id})`.mapWith(Number),
      auditCount: sql<number>`count(distinct ${audits.id})`.mapWith(Number),
    })
    .from(users)
    .leftJoin(sites, eq(sites.userId, users.id))
    .leftJoin(audits, eq(audits.siteId, sites.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
}

export interface AdminUserDetail {
  user: User
  sites: (Site & { auditCount: number; latestHealthScore: number | null })[]
}

/** Single user with full profile + their sites (each with audit count + latest score). */
export async function getUserDetailForAdmin(userId: string): Promise<AdminUserDetail | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return null

  const userSites = await db.query.sites.findMany({
    where: eq(sites.userId, userId),
    orderBy: [desc(sites.createdAt)],
  })

  const siteIds = userSites.map((s) => s.id)
  const siteAudits = siteIds.length > 0
    ? await db.query.audits.findMany({
        where: inArray(audits.siteId, siteIds),
        orderBy: [desc(audits.createdAt)],
      })
    : []

  const auditsBySite = new Map<string, Audit[]>()
  for (const a of siteAudits) {
    const list = auditsBySite.get(a.siteId) ?? []
    list.push(a)
    auditsBySite.set(a.siteId, list)
  }

  const enrichedSites = userSites.map((s) => {
    const siteAuditList = auditsBySite.get(s.id) ?? []
    const latest = siteAuditList.find((a) => a.healthScore != null)
    return {
      ...s,
      auditCount: siteAuditList.length,
      latestHealthScore: latest?.healthScore ?? null,
    }
  })

  return { user, sites: enrichedSites }
}

/* ── Sites ───────────────────────────────────────────────────────────── */

export interface AdminSiteRow {
  id: string
  domain: string
  displayName: string | null
  ownerId: string
  ownerEmail: string
  ownerName: string | null
  auditCount: number
  latestHealthScore: number | null
  latestAuditStatus: Audit["status"] | null
  createdAt: Date
}

/** All sites platform-wide with owner + latest audit info, newest first. */
export async function getAllSitesForAdmin(): Promise<AdminSiteRow[]> {
  const rows = await db
    .select({
      id: sites.id,
      domain: sites.domain,
      displayName: sites.displayName,
      ownerId: users.id,
      ownerEmail: users.email,
      ownerName: users.name,
      createdAt: sites.createdAt,
    })
    .from(sites)
    .innerJoin(users, eq(sites.userId, users.id))
    .orderBy(desc(sites.createdAt))

  if (rows.length === 0) return []

  const siteIds = rows.map((r) => r.id)
  const allAudits = await db.query.audits.findMany({
    where: inArray(audits.siteId, siteIds),
    orderBy: [desc(audits.createdAt)],
  })

  const auditsBySite = new Map<string, Audit[]>()
  for (const a of allAudits) {
    const list = auditsBySite.get(a.siteId) ?? []
    list.push(a)
    auditsBySite.set(a.siteId, list)
  }

  return rows.map((r) => {
    const siteAuditList = auditsBySite.get(r.id) ?? []
    const latest = siteAuditList[0]
    const latestScored = siteAuditList.find((a) => a.healthScore != null)
    return {
      ...r,
      auditCount: siteAuditList.length,
      latestHealthScore: latestScored?.healthScore ?? null,
      latestAuditStatus: latest?.status ?? null,
    }
  })
}

/* ── Audits ──────────────────────────────────────────────────────────── */

export interface AdminAuditRow {
  id: string
  siteId: string
  domain: string
  ownerEmail: string
  status: Audit["status"]
  healthScore: number | null
  pagesCount: number | null
  errorMessage: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

/** Most recent N audits platform-wide, newest first — for ops visibility. */
export async function getRecentAuditsForAdmin(limit = 100): Promise<AdminAuditRow[]> {
  return db
    .select({
      id: audits.id,
      siteId: audits.siteId,
      domain: sites.domain,
      ownerEmail: users.email,
      status: audits.status,
      healthScore: audits.healthScore,
      pagesCount: audits.pagesCount,
      errorMessage: audits.errorMessage,
      startedAt: audits.startedAt,
      completedAt: audits.completedAt,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .innerJoin(sites, eq(audits.siteId, sites.id))
    .innerJoin(users, eq(sites.userId, users.id))
    .orderBy(desc(audits.createdAt))
    .limit(limit)
}

/** Audits stuck in queued/running for over `staleMinutes` — likely the worker isn't running. */
export async function getStuckAudits(staleMinutes = 15): Promise<AdminAuditRow[]> {
  const rows = await db
    .select({
      id: audits.id,
      siteId: audits.siteId,
      domain: sites.domain,
      ownerEmail: users.email,
      status: audits.status,
      healthScore: audits.healthScore,
      pagesCount: audits.pagesCount,
      errorMessage: audits.errorMessage,
      startedAt: audits.startedAt,
      completedAt: audits.completedAt,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .innerJoin(sites, eq(audits.siteId, sites.id))
    .innerJoin(users, eq(sites.userId, users.id))
    .where(
      sql`${audits.status} IN ('queued', 'running') AND ${audits.createdAt} < now() - (${staleMinutes} || ' minutes')::interval`
    )
    .orderBy(desc(audits.createdAt))

  return rows
}

/* ── Platform stats + billing ───────────────────────────────────────── */

export interface AdminPlatformStats {
  totalUsers: number
  usersByPlan: Record<string, number>
  totalSites: number
  totalAudits: number
  auditsLast7d: number
  auditsLast30d: number
  failedAuditsLast7d: number
  newUsersLast7d: number
  newUsersLast30d: number
}

export async function getPlatformStats(): Promise<AdminPlatformStats> {
  const [userTotal] = await db.select({ n: count() }).from(users)
  const [siteTotal] = await db.select({ n: count() }).from(sites)
  const [auditTotal] = await db.select({ n: count() }).from(audits)

  const planRows = await db.select({ plan: users.plan, n: count() }).from(users).groupBy(users.plan)
  const usersByPlan: Record<string, number> = { starter: 0, growth: 0, agency: 0 }
  for (const row of planRows) usersByPlan[row.plan] = row.n

  const [audits7d] = await db.select({ n: count() }).from(audits)
    .where(sql`${audits.createdAt} > now() - interval '7 days'`)
  const [audits30d] = await db.select({ n: count() }).from(audits)
    .where(sql`${audits.createdAt} > now() - interval '30 days'`)
  const [failedAudits7d] = await db.select({ n: count() }).from(audits)
    .where(sql`${audits.status} = 'failed' AND ${audits.createdAt} > now() - interval '7 days'`)
  const [newUsers7d] = await db.select({ n: count() }).from(users)
    .where(sql`${users.createdAt} > now() - interval '7 days'`)
  const [newUsers30d] = await db.select({ n: count() }).from(users)
    .where(sql`${users.createdAt} > now() - interval '30 days'`)

  return {
    totalUsers: userTotal?.n ?? 0,
    usersByPlan,
    totalSites: siteTotal?.n ?? 0,
    totalAudits: auditTotal?.n ?? 0,
    auditsLast7d: audits7d?.n ?? 0,
    auditsLast30d: audits30d?.n ?? 0,
    failedAuditsLast7d: failedAudits7d?.n ?? 0,
    newUsersLast7d: newUsers7d?.n ?? 0,
    newUsersLast30d: newUsers30d?.n ?? 0,
  }
}

export interface AdminBillingOverview {
  mrrUsd: number
  usersByPlan: Record<string, number>
  revenueByPlan: Record<string, number>
  subscriptionStatusCounts: Record<string, number>
  activePaidUsers: number
}

/** Estimated MRR from plan tiers — not Stripe-verified, a directional number for the team. */
export async function getBillingOverview(): Promise<AdminBillingOverview> {
  const planRows = await db.select({ plan: users.plan, n: count() }).from(users).groupBy(users.plan)
  const planCounts = { starter: 0, growth: 0, agency: 0 }
  for (const row of planRows) planCounts[row.plan] = row.n

  const growthRevenue = planCounts.growth * PLAN_PRICE_USD.growth
  const agencyRevenue = planCounts.agency * PLAN_PRICE_USD.agency
  const revenueByPlan: Record<string, number> = {
    starter: 0,
    growth: growthRevenue,
    agency: agencyRevenue,
  }
  const usersByPlan: Record<string, number> = planCounts
  const mrrUsd = growthRevenue + agencyRevenue

  const statusRows = await db
    .select({ status: users.subscriptionStatus, n: count() })
    .from(users)
    .groupBy(users.subscriptionStatus)
  const subscriptionStatusCounts: Record<string, number> = {}
  for (const row of statusRows) subscriptionStatusCounts[row.status ?? "none"] = row.n

  return {
    mrrUsd,
    usersByPlan,
    revenueByPlan,
    subscriptionStatusCounts,
    activePaidUsers: planCounts.growth + planCounts.agency,
  }
}
