import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { listSites } from "@/domain/sites/service"
import { PLAN_LIMITS } from "@/lib/constants"

/** GET /api/v1/me — current authenticated user profile + plan info */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 })
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
  if (!user) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 })
  }

  const sites = await listSites(session.user.id)
  const limits = PLAN_LIMITS[user.plan]

  return NextResponse.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      limits: {
        sites: limits.sites,
        pagesPerCrawl: limits.pagesPerCrawl,
        auditsPerMonth: limits.auditsPerMonth,
      },
      usage: {
        sitesCount: sites.length,
      },
      notifications: {
        auditComplete: user.notifyAuditComplete,
        weeklyDigest: user.notifyWeeklyDigest,
        criticalOnly: user.notifyCriticalOnly,
      },
      createdAt: user.createdAt.toISOString(),
    },
  })
}
