import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getSitesByUser } from "@/db/repositories/sites"
import { triggerAudit } from "@/domain/audit/service"
import { logger } from "@/infra/logger"

/** POST /api/v1/agency/bulk-audit — trigger audits for all or selected sites */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { siteIds?: string[] }
  const userId = session.user.id

  const sites = await getSitesByUser(userId)
  const targets = body.siteIds?.length
    ? sites.filter(s => body.siteIds!.includes(s.id))
    : sites

  if (targets.length === 0) {
    return NextResponse.json({ error: "No sites found" }, { status: 400 })
  }

  const results: { siteId: string; domain: string; status: "queued" | "error"; auditId?: string }[] = []

  for (const site of targets) {
    try {
      const audit = await triggerAudit(site.id, userId)
      results.push({ siteId: site.id, domain: site.domain, status: "queued", auditId: audit.id })
    } catch (err) {
      logger.warn({ siteId: site.id, domain: site.domain, err }, "Bulk audit: failed to queue")
      results.push({ siteId: site.id, domain: site.domain, status: "error" })
    }
  }

  const queued = results.filter(r => r.status === "queued").length
  logger.info({ userId, queued, total: targets.length }, "Bulk audit triggered")

  return NextResponse.json({ queued, total: targets.length, results })
}
