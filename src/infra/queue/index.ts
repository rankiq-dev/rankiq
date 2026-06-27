/* BullMQ bundles its own ioredis internally — we pass URL-based connection options
   to avoid the dual-ioredis type clash. Cache operations use the ioredis package
   directly (see src/infra/cache/index.ts). */
import { Queue, Worker, type Processor, type ConnectionOptions } from "bullmq"
import { logger } from "@/infra/logger"

function getConnectionOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL
  if (!url) throw new Error("REDIS_URL is required — cannot connect to Redis")
  /* BullMQ accepts { url } directly and manages its own ioredis connection */
  return { url } as ConnectionOptions
}

export const QUEUE_NAMES = {
  CRAWL:          "crawl",
  AUDIT:          "audit",
  ACTION_PLAN:    "action-plan",
  EMAIL:          "email",
  SCHEDULED_AUDIT: "scheduled-audit",
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

export function createQueue<T>(name: QueueName) {
  return new Queue<T>(name, {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  })
}

export function createWorker<T>(name: QueueName, processor: Processor<T>) {
  const worker = new Worker<T>(name, processor, {
    connection: getConnectionOptions(),
    concurrency: 2,
  })

  worker.on("completed", (job) =>
    logger.info({ jobId: job.id, queue: name }, "Job completed")
  )
  worker.on("failed", (job, err) =>
    logger.error({ jobId: job?.id, queue: name, err }, "Job failed")
  )

  return worker
}
