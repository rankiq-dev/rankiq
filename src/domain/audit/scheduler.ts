import { createQueue, QUEUE_NAMES } from "@/infra/queue"
import { db } from "@/db"
import { sites, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { triggerAudit } from "./service"
import { logger } from "@/infra/logger"

const scheduledQueue = createQueue<Record<string, never>>(QUEUE_NAMES.SCHEDULED_AUDIT)

/**
 * Register the weekly repeatable job in BullMQ.
 * Call this once on worker startup — BullMQ deduplicates by jobId.
 */
export async function registerWeeklyAuditJob() {
  await scheduledQueue.add(
    "weekly-audit",
    {},
    {
      jobId: "weekly-audit-recurring",
      repeat: { pattern: "0 2 * * 1" }, /* Every Monday at 2am UTC */
      removeOnComplete: 10,
      removeOnFail: 50,
    }
  )
  logger.info("Weekly audit cron registered (Mon 2am UTC)")
}

/**
 * Run weekly audits for all sites whose plan allows it.
 * Called by the scheduled-audit worker.
 */
export async function runScheduledAudits() {
  logger.info("Running scheduled weekly audits")

  const allSites = await db
    .select({ id: sites.id, userId: sites.userId, domain: sites.domain })
    .from(sites)
    .innerJoin(users, eq(sites.userId, users.id))
    .where(eq(users.plan, "growth"))  /* Growth + Agency plans get weekly audits */

  /* Also include agency plan users */
  const agencySites = await db
    .select({ id: sites.id, userId: sites.userId, domain: sites.domain })
    .from(sites)
    .innerJoin(users, eq(sites.userId, users.id))
    .where(eq(users.plan, "agency"))

  const allToAudit = [...allSites, ...agencySites]
  logger.info({ count: allToAudit.length }, "Scheduled audit: triggering for sites")

  let success = 0
  let failed = 0
  for (const site of allToAudit) {
    try {
      await triggerAudit(site.id, site.userId)
      success++
    } catch (err) {
      logger.warn({ siteId: site.id, domain: site.domain, err }, "Failed to schedule audit for site")
      failed++
    }
  }

  logger.info({ success, failed, total: allToAudit.length }, "Scheduled audit run complete")
}
