import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSitesByUser } from "@/db/repositories/sites"
import { getUserById } from "@/db/repositories/users"
import { triggerAudit } from "@/domain/audit/service"
import { logger } from "@/infra/logger"

/** POST /api/v1/agency/bulk-audit — trigger audits for all sites (agency plan only) */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await getUserById(session.user.id)
  if (!user || user.plan !== "agency") {
    return NextResponse.json({ error: "Agency plan required" }, { status: 403 })
  }

  const sites = await getSitesByUser(session.user.id)
  if (sites.length === 0) return NextResponse.json({ data: { triggered: 0 } })

  let triggered = 0
  let failed = 0
  for (const site of sites) {
    try {
      await triggerAudit(site.id, session.user.id)
      triggered++
    } catch (err) {
      logger.warn({ siteId: site.id, err }, "Bulk audit: failed to trigger")
      failed++
    }
  }

  logger.info({ userId: session.user.id, triggered, failed }, "Bulk audit triggered")
  return NextResponse.json({ data: { triggered, failed, total: sites.length } })
}
