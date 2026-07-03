import { sql, desc, eq, count } from "drizzle-orm"
import { db } from "@/db"
import { users, sites, audits, type User } from "@/db/schema"

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
  const rows = await db
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

  return rows
}

export interface AdminPlatformStats {
  totalUsers: number
  usersByPlan: Record<string, number>
  totalSites: number
  totalAudits: number
  auditsLast7d: number
  auditsLast30d: number
}

export async function getPlatformStats(): Promise<AdminPlatformStats> {
  const [userTotal] = await db.select({ n: count() }).from(users)
  const [siteTotal] = await db.select({ n: count() }).from(sites)
  const [auditTotal] = await db.select({ n: count() }).from(audits)

  const planRows = await db
    .select({ plan: users.plan, n: count() })
    .from(users)
    .groupBy(users.plan)

  const usersByPlan: Record<string, number> = { starter: 0, growth: 0, agency: 0 }
  for (const row of planRows) usersByPlan[row.plan] = row.n

  const [audits7d] = await db
    .select({ n: count() })
    .from(audits)
    .where(sql`${audits.createdAt} > now() - interval '7 days'`)
  const [audits30d] = await db
    .select({ n: count() })
    .from(audits)
    .where(sql`${audits.createdAt} > now() - interval '30 days'`)

  return {
    totalUsers: userTotal?.n ?? 0,
    usersByPlan,
    totalSites: siteTotal?.n ?? 0,
    totalAudits: auditTotal?.n ?? 0,
    auditsLast7d: audits7d?.n ?? 0,
    auditsLast30d: audits30d?.n ?? 0,
  }
}
