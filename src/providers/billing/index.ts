import Stripe from "stripe"
import { config } from "@/config"
import { logger } from "@/infra/logger"
import type { Plan } from "@/lib/types"

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(config.stripeSecretKey, { apiVersion: "2025-02-24.acacia" })
  }
  return _stripe
}

/* Plan → Stripe price ID mapping; price IDs live in env vars, never in code */
const PLAN_PRICE_IDS: Record<Exclude<Plan, "starter">, string> = {
  growth: config.stripeGrowthPriceId,
  agency: config.stripeAgencyPriceId,
}

export type CheckoutResult = { url: string }

export async function createCheckoutSession(opts: {
  userId: string
  email: string
  plan: Exclude<Plan, "starter">
  successUrl: string
  cancelUrl: string
}): Promise<CheckoutResult> {
  const priceId = PLAN_PRICE_IDS[opts.plan]
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan "${opts.plan}"`)
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: opts.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { userId: opts.userId, plan: opts.plan },
    subscription_data: { metadata: { userId: opts.userId, plan: opts.plan } },
  })

  if (!session.url) throw new Error("Stripe checkout session returned no URL")

  logger.info({ userId: opts.userId, plan: opts.plan }, "Stripe checkout session created")
  return { url: session.url }
}

export async function createCustomerPortalSession(opts: {
  stripeCustomerId: string
  returnUrl: string
}): Promise<{ url: string }> {
  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: opts.stripeCustomerId,
    return_url: opts.returnUrl,
  })
  return { url: session.url }
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  return getStripe().webhooks.constructEvent(payload, signature, config.stripeWebhookSecret)
}

export type { Stripe }
