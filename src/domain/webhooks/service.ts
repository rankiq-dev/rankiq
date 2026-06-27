import { createHmac } from "crypto"
import { eq, and } from "drizzle-orm"
import { db } from "@/db"
import { webhooks, type Webhook } from "@/db/schema"
import { logger } from "@/infra/logger"

type WebhookEvent = "audit.complete" | "audit.failed" | "site.created"

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
}

async function deliverWebhook(webhook: Webhook, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload)
  const sig = signPayload(webhook.secret, body)

  const res = await fetch(webhook.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RankIQ-Signature": sig,
      "X-RankIQ-Event": payload.event,
      "User-Agent": "RankIQ-Webhooks/1.0",
    },
    body,
    signal: AbortSignal.timeout(10000),
  })

  await db.update(webhooks)
    .set({
      lastFiredAt: new Date(),
      lastStatus: res.status,
      failureCount: res.ok ? 0 : (webhook.failureCount + 1),
      isActive: res.ok ? webhook.isActive : (webhook.failureCount + 1 >= 5 ? false : webhook.isActive),
    })
    .where(eq(webhooks.id, webhook.id))

  if (!res.ok) {
    throw new Error(`Webhook delivery failed: ${res.status} ${res.statusText}`)
  }
}

export async function fireWebhookEvent(userId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const userWebhooks = await db.query.webhooks.findMany({
    where: and(eq(webhooks.userId, userId), eq(webhooks.isActive, true)),
  })

  const eligible = userWebhooks.filter(w => w.events.split(",").map(e => e.trim()).includes(event))
  if (eligible.length === 0) return

  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data }

  await Promise.allSettled(eligible.map(async (w) => {
    try {
      await deliverWebhook(w, payload)
      logger.info({ webhookId: w.id, url: w.url, event }, "Webhook delivered")
    } catch (err) {
      logger.warn({ webhookId: w.id, url: w.url, event, err }, "Webhook delivery failed")
    }
  }))
}
