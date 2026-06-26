import { z } from "zod"

/* Stripe webhook event types RankIQ handles */
export const stripeEventTypeSchema = z.enum([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
])

export type StripeEventType = z.infer<typeof stripeEventTypeSchema>
