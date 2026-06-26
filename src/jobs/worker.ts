/* BullMQ worker process — runs on Railway (not Vercel serverless).
   Start with: npm run worker */
import { createWorker, QUEUE_NAMES } from "@/infra/queue"
import { logger } from "@/infra/logger"
import { generateActionPlan } from "@/domain/action-plan/service"

logger.info("Worker process starting")

/* ── Crawl job ── */
import { processCrawlJob } from "@/domain/audit/service"

const crawlWorker = createWorker<{ auditId: string; siteId: string; domain: string; maxPages: number }>(
  QUEUE_NAMES.CRAWL,
  async (job) => {
    logger.info({ jobId: job.id, auditId: job.data.auditId, domain: job.data.domain }, "Processing crawl job")
    await processCrawlJob(job.data)
  }
)

/* ── Action Plan job ── */
const actionPlanWorker = createWorker<{ auditId: string }>(
  QUEUE_NAMES.ACTION_PLAN,
  async (job) => {
    logger.info({ jobId: job.id, auditId: job.data.auditId }, "Processing action plan job")
    await generateActionPlan(job.data.auditId)
  }
)

/* ── Email job ── */
import { processEmailJob, type EmailJobPayload } from "@/domain/email/service"

const emailWorker = createWorker<EmailJobPayload>(
  QUEUE_NAMES.EMAIL,
  async (job) => {
    logger.info({ jobId: job.id, type: job.data.type }, "Processing email job")
    await processEmailJob(job.data)
  }
)

/* Graceful shutdown */
async function shutdown() {
  logger.info("Worker shutting down")
  await crawlWorker.close()
  await actionPlanWorker.close()
  await emailWorker.close()
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT",  shutdown)
