import { createQueue, QUEUE_NAMES } from "@/infra/queue"
import { db } from "@/db"
import { sites, users } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"
import { triggerAudit } from "./service"
import { logger } from "@/infra/logger"

const emailQueue = createQueue<{ type: string; userId: string }>(QUEUE_NAMES.EMAIL)

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
 * Determine if a site's auditSchedule should run today.
 * The cron fires every Monday; biweekly = alternate Mondays; monthly = first Monday.
 */
function shouldAuditToday(schedule: string): boolean {
  const now = new Date()
  const week = Math.floor(now.getDate() / 7)
  if (schedule === "off") return false
  if (schedule === "weekly") return true
  if (schedule === "biweekly") return week % 2 === 0
  if (schedule === "monthly") return now.getDate() <= 7   /* first week of month */
  return true
}

/**
 * Run weekly audits for all sites whose plan allows it.
 * Called by the scheduled-audit worker every Monday at 2am UTC.
 */
export async function runScheduledAudits() {
  logger.info("Running scheduled weekly audits")

  const allSites = await db
    .select({ id: sites.id, userId: sites.userId, domain: sites.domain, auditSchedule: sites.auditSchedule })
    .from(sites)
    .innerJoin(users, eq(sites.userId, users.id))
    .where(eq(users.plan, "growth"))

  const agencySites = await db
    .select({ id: sites.id, userId: sites.userId, domain: sites.domain, auditSchedule: sites.auditSchedule })
    .from(sites)
    .innerJoin(users, eq(sites.userId, users.id))
    .where(eq(users.plan, "agency"))

  const allToAudit = [...allSites, ...agencySites].filter(s => shouldAuditToday(s.auditSchedule))
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

  /* Queue weekly digest emails for all users who had sites audited */
  const userIds = [...new Set(allToAudit.map(s => s.userId))]
  if (userIds.length > 0) {
    const eligibleUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, userIds))
    await Promise.all(eligibleUsers.map(u =>
      emailQueue.add("weekly-digest", { type: "weekly_digest", userId: u.id }, { delay: 5 * 60 * 1000 /* 5min delay so audits can complete */ })
    ))
    logger.info({ count: eligibleUsers.length }, "Queued weekly digest emails")
  }
}
