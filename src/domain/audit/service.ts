import { createQueue, QUEUE_NAMES } from "@/infra/queue"
import { logger } from "@/infra/logger"
import { createAudit, updateAuditStatus, bulkInsertIssues } from "@/db/repositories/audits"
import { getSiteById } from "@/db/repositories/sites"
import { getUserById } from "@/db/repositories/users"
import { crawlSite } from "./crawler"
import { analyzePages, computeHealthScore, buildPageAnalyses } from "./analyzer"
import { PLAN_LIMITS, CRAWL_TIMEOUT_MS } from "@/lib/constants"
import { db } from "@/db"
import type { Audit } from "@/db/schema"

import type { EmailJobPayload } from "@/domain/email/service"

const crawlQueue = createQueue<{ auditId: string; siteId: string; domain: string; maxPages: number }>(
  QUEUE_NAMES.CRAWL
)
const actionPlanQueue = createQueue<{ auditId: string }>(QUEUE_NAMES.ACTION_PLAN)
const emailQueue      = createQueue<EmailJobPayload>(QUEUE_NAMES.EMAIL)

/** Enqueue a new crawl job for a site. Returns the created Audit record. */
export async function triggerAudit(siteId: string, userId: string): Promise<Audit> {
  const site = await getSiteById(siteId, userId)
  if (!site) throw new Error(`Site ${siteId} not found or not owned by user ${userId}`)

  const user = await getUserById(userId)
  if (!user) throw new Error(`User ${userId} not found`)

  const maxPages = PLAN_LIMITS[user.plan].pagesPerCrawl

  const audit = await createAudit({ siteId, status: "queued" })

  await crawlQueue.add(
    "crawl",
    { auditId: audit.id, siteId, domain: site.domain, maxPages },
    { jobId: `crawl-${audit.id}` }  /* idempotency: one job per audit */
  )

  logger.info({ auditId: audit.id, siteId, domain: site.domain, maxPages }, "Audit queued")
  return audit
}

/**
 * Process a crawl job. Called by the BullMQ worker.
 * Runs the crawler, analyzes results, persists issues, updates audit record.
 */
export async function processCrawlJob(data: {
  auditId: string
  siteId: string
  domain: string
  maxPages: number
}): Promise<void> {
  const { auditId, domain, maxPages } = data

  await updateAuditStatus(auditId, {
    status: "running",
    startedAt: new Date(),
  })

  try {
    const result = await crawlSite(domain, { maxPages, timeoutMs: CRAWL_TIMEOUT_MS })

    const issues = analyzePages(auditId, result)
    const healthScore = computeHealthScore(issues)
    const pageAnalyses = buildPageAnalyses(result.pages, issues)

    await bulkInsertIssues(issues)
    await updateAuditStatus(auditId, {
      status: "complete",
      pagesCount: result.pages.length,
      healthScore,
      pageAnalyses,
      completedAt: new Date(),
    })

    /* Auto-trigger action plan after successful crawl */
    await actionPlanQueue.add(
      "action-plan",
      { auditId },
      { jobId: `action-plan-${auditId}` }
    )

    /* Enqueue report email with 30s delay so action plan can finish first */
    const siteForEmail = await db.query.sites.findFirst({ where: (s, { eq }) => eq(s.id, data.siteId) })
    if (siteForEmail?.userId) {
      await emailQueue.add(
        "audit-report",
        { type: "audit_report", auditId, userId: siteForEmail.userId },
        { jobId: `email-report-${auditId}`, delay: 30_000 }
      )
    }

    logger.info(
      { auditId, domain, pagesCount: result.pages.length, issueCount: issues.length, healthScore },
      "Audit complete — action plan + email queued"
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await updateAuditStatus(auditId, {
      status: "failed",
      errorMessage: message,
      completedAt: new Date(),
    })
    logger.error({ auditId, domain, err }, "Audit failed")
    throw err  /* re-throw so BullMQ marks the job as failed and retries */
  }
}
